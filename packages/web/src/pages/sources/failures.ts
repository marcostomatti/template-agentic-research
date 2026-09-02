/**
 * @packageDocumentation
 * The failures modal's decisions: what a keep and a discard record on
 * a failed capture, and how a ruling is read back off one.
 *
 * Beside the modal rather than inside it, for the reason `./editor.ts`
 * and `./approval.ts` give about their own: the unit runner collects
 * `.ts` files under `src` in a node environment, so a decision living
 * in a `.tsx` is reachable by no test in this package at all.
 *
 * ## What a ruling really moves, and what it moves here
 *
 * `../../data/api.ts` says in as many words that WHICH member a keep
 * or a discard moves is this modal's decision, and it leaves the
 * choice open so the queue it answers follows whatever that decision
 * turns out to be. This module is where the choice is made, so it is
 * also where the cost of it has to be written down.
 *
 * A real endpoint records the ruling and KEEPS the document: a
 * capture that failed to parse is evidence about a source, which is
 * why `resolveSourceFailure` is typed as a POST rather than a delete.
 * What such an endpoint does not do is rewrite `parse_status` — the
 * parse really did fail, and a keep that moved that column would
 * erase the one reading a drifting feed leaves behind.
 *
 * Which leaves this shell with no honest member to move. `Document`
 * mirrors nine columns and not one of them records a ruling, and the
 * table that would is one `../../data/drafts.ts` cannot reach: that
 * store EDITS rows and cannot insert one. So the ruling is recorded
 * as a MARK on the row the seam can write, exactly as
 * `../digest/actions.ts` records a research request on the finding
 * itself, and for the same reason.
 *
 * The mark is a first LINE on `parse_error`, behind a reserved
 * namespace no parser would emit and nothing in the schema declares,
 * read back by {@link readFailureRuling} and by nothing else.
 * {@link failureReason} is the other half of it: the error as it was
 * stored, with that line taken off, so the reading an operator opened
 * the list for survives being ruled on. Both go through one private
 * reader, which is what keeps them from disagreeing about whether a
 * given string carries a mark.
 *
 * Two consequences, both worth stating rather than discovering.
 *
 * The queue does NOT shorten. `fetchSourceFailures` filters on
 * `parseStatus` and this writes `parseError`, so a ruled capture
 * stays in the list wearing what it was ruled — the same shape
 * `./SourceConfigApprovalModal.tsx` settles on, for the same reason:
 * nothing behind the modal draws a failure, so the re-read is the
 * only confirmation an operator gets. That accessor applies its
 * predicate OVER the draft overlay on purpose, so the day the seam is
 * re-pointed the endpoint moves whatever it moves and the queue
 * follows it with nothing here to change.
 *
 * And the mark goes with the fixture modules. It is not a column, no
 * migration will add one, and nothing outside this module reads
 * `parse_error` at all.
 *
 * ## Keep and discard differ in what they SAY, not in what they move
 *
 * Both are resolutions and both record one mark, which is a narrowing
 * rather than a shrug. What separates them is a decision about the
 * corpus — whether the capture stays in it despite the failure — and
 * the corpus is on the far side of the seam. So this shell records
 * WHICH answer was given and leaves acting on it to the endpoint,
 * instead of inventing a second column to be wrong about.
 *
 * Re-ruling replaces the mark rather than stacking one on it, which
 * is what makes a mis-click recoverable with the control that made
 * it.
 *
 * ## Nothing here quotes a capture
 *
 * The sentences below are constants. {@link failureTitle} and
 * {@link failureActionName} do carry a document's own address, which
 * is the exception a name has to be: a control that acts on one row
 * of several has to say which. Neither is a refusal, and no refusal
 * in this module reads the payload — the rule `./approval.ts` and
 * `../../components/jsonDraft.ts` both keep.
 */

import type { Document } from '../../data/types';

/**
 * The two answers an operator has to a failed capture.
 *
 * A closed union rather than a column: the header says why neither
 * member is a stored value in this shell, and why that is the
 * narrowing rather than the design.
 */
export type FailureRuling = 'keep' | 'discard';

/**
 * Both rulings, in the order the row offers them.
 *
 * Exported so a caller iterating the answers reads this rather than
 * spelling a second list — and read back by {@link readFailureRuling}
 * as the membership check on a mark, so a spelling that is not one of
 * these cannot be mistaken for a ruling this module wrote.
 *
 * Keep leads because it is the answer that changes least: a capture
 * kept is the state it was already in, and a list is safer to work
 * down when the leading control is the conservative one.
 */
export const FAILURE_RULINGS: readonly FailureRuling[] = ['keep', 'discard'];

/**
 * What a marked `parse_error` starts with.
 *
 * Namespaced with a colon on the reasoning `../digest/actions.ts`
 * sets out for its own reserved key: a parse error is whatever a
 * parser wrote, and this is not one. Nothing in the schema declares
 * it, no fixture carries it, and the only two functions that know it
 * exists are the private reader below and the writer beneath that.
 */
const RULING_MARK_PREFIX = 'ar:failure-ruling=';

/**
 * What separates the mark from the error it was written in front of.
 *
 * A newline, so the stored text keeps its own first line rather than
 * being run together with a token. It is also what makes a stored
 * error carrying newlines of its own survive a round trip: only the
 * FIRST break is read, and everything past it is the reason.
 */
const RULING_MARK_SEPARATOR = '\n';

/** What a capture with no address of its own is called. */
export const NO_ADDRESS_TITLE = 'Capture with no address';

/** What the reason line says where the store held no error at all. */
export const NO_REASON_SENTENCE = 'No reason was recorded with this '
  + 'failure.';

/**
 * What one ruling is called and what it means, per answer.
 *
 * A reading rather than markup, and one table rather than two: the
 * button that offers a ruling and the badge that reports one made are
 * two spellings of the same answer, and splitting them is how a
 * screen comes to call the same act two things. {@link
 * failureActionName} builds the control name off this too, so the
 * accessible name of a keep button carries its visible label by
 * construction rather than by two literals agreeing.
 */
export interface FailureRulingReading {
  /** What the button offering this ruling says. */
  readonly action: string;
  /** What the badge on a capture ruled this way says. */
  readonly ruled: string;
  /** What choosing it means, in one line under the list. */
  readonly sentence: string;
  /** Which `Badge` tone carries the ruled reading. */
  readonly tone: 'success' | 'warning';
}

/**
 * The words each ruling carries, total over the union.
 *
 * Total rather than a branch, on the rule `./approval.ts` follows: a
 * member added to the answer set is a `check-types` error here rather
 * than a row rendering a blank.
 *
 * Neither sentence promises anything about the corpus, because this
 * shell cannot keep such a promise — see the header. They say what
 * the operator has recorded, which is the part that is true on both
 * sides of the seam.
 */
const RULING_READINGS: Readonly<Record<FailureRuling, FailureRulingReading>> = {
  keep: {
    action: 'Keep',
    ruled: 'Kept',
    sentence: 'Recorded as worth keeping. The capture stays where it '
      + 'is and the parse error stays beside it.',
    tone: 'success',
  },
  discard: {
    action: 'Discard',
    ruled: 'Discarded',
    sentence: 'Recorded as not worth keeping. Nothing is deleted here '
      + '— a failed capture is evidence about the feed.',
    tone: 'warning',
  },
};

/** What one reading of a `parse_error` string amounts to. */
interface MarkReading {
  /** The ruling it carries, or undefined where it carries none. */
  readonly ruling: FailureRuling | undefined;
  /** The stored error, mark taken off; null where there is none. */
  readonly reason: string | null;
}

/**
 * Read a stored `parse_error` as a ruling and a reason.
 *
 * The ONE place the mark is understood. Both public readers go
 * through it rather than each parsing the string, which is what stops
 * them disagreeing about whether a given text carries a mark — a
 * disagreement that would show as a badge over an error still wearing
 * the token that produced it.
 *
 * A reserved line whose answer is not a member of
 * {@link FAILURE_RULINGS} is nothing this module wrote, so it is
 * reported as an ordinary stored error, whole. Half-stripping it
 * would be this file editing text it does not own.
 *
 * @param parseError - The column as stored, null included.
 * @returns What was ruled, and what the parser said.
 */
function readMark(parseError: string | null): MarkReading {
  if (parseError === null || !parseError.startsWith(RULING_MARK_PREFIX)) {
    return { ruling: undefined, reason: parseError };
  }

  const marked = parseError.slice(RULING_MARK_PREFIX.length);
  const breakAt = marked.indexOf(RULING_MARK_SEPARATOR);
  const spelling = breakAt === -1
    ? marked
    : marked.slice(0, breakAt);
  const ruling = FAILURE_RULINGS.find((member) => member === spelling);

  if (ruling === undefined) {
    return { ruling: undefined, reason: parseError };
  }

  return {
    ruling,
    reason: breakAt === -1
      ? null
      : marked.slice(breakAt + RULING_MARK_SEPARATOR.length),
  };
}

/**
 * What somebody has ruled about one failed capture, if anything.
 *
 * @param document - The capture as the read answered it, this tab's
 * rulings already overlaid.
 * @returns The ruling recorded on it, or undefined for one nobody has
 * worked through yet.
 */
export function readFailureRuling(
  document: Document,
): FailureRuling | undefined {
  return readMark(document.parseError).ruling;
}

/**
 * Why the parse failed — the stored error, without the mark.
 *
 * The reading the list exists for, and it survives a ruling: an
 * operator who has just kept a capture can still see what was wrong
 * with it, which is what makes the ruling reviewable at all.
 *
 * @param document - The capture as the read answered it.
 * @returns The parser's own text, or null where the store held none.
 */
export function failureReason(document: Document): string | null {
  return readMark(document.parseError).reason;
}

/**
 * Record a ruling on one failed capture.
 *
 * Every other member is carried through untouched, `parseStatus`
 * included — the header says why moving it would be a claim about the
 * parse that nobody made.
 *
 * Re-ruling replaces: the reason is read back through the same reader
 * that strips it, so a capture ruled twice carries one mark and its
 * original error rather than a stack of tokens.
 *
 * @param document - The capture as it stands.
 * @param ruling - The answer given.
 * @returns The row to record through `resolveSourceFailure`.
 */
export function ruleOnFailure(
  document: Document,
  ruling: FailureRuling,
): Document {
  const reason = failureReason(document);

  return {
    ...document,
    parseError: reason === null
      ? `${RULING_MARK_PREFIX}${ruling}`
      : `${RULING_MARK_PREFIX}${ruling}${RULING_MARK_SEPARATOR}${reason}`,
  };
}

/**
 * What the modal says above the failure, per ruling.
 *
 * @param ruling - The answer given, or the one being offered.
 * @returns Its words and the tone that carries them.
 */
export function describeFailureRuling(
  ruling: FailureRuling,
): FailureRulingReading {
  return RULING_READINGS[ruling];
}

/**
 * How the footer reads the size of the list above it.
 *
 * Two figures rather than one, because this queue does not shorten:
 * the header says why a ruling moves no member `fetchSourceFailures`
 * reads, so `3 failed captures` alone would look identical before and
 * after an afternoon of work. The second figure is the only progress
 * reading this surface has.
 *
 * The `ruled` clause is dropped while nothing has been ruled, so a
 * list opened and not yet worked states a count rather than the
 * tautology `none ruled`.
 *
 * @param total - How many failed captures the source has.
 * @param ruled - How many of them carry a ruling.
 * @returns The footer text.
 */
export function failureCountLabel(total: number, ruled: number): string {
  const noun = total === 1
    ? 'failed capture'
    : 'failed captures';

  return ruled === 0
    ? `${total} ${noun}`
    : `${total} ${noun}, ${ruled} ruled`;
}

/**
 * What one failed capture is called in the list.
 *
 * Its own address, which is the only member of a document that names
 * the ITEM rather than describing it — `body` is extracted text and
 * `hash` is a key. `documents.url` is NULL where there is no such
 * place (an ingested file, a pasted body), so the fallback is a
 * sentence and never the empty string.
 *
 * Two captures of one address are possible in principle and would
 * draw two rows with one name. A spec reads such a list by ROW rather
 * than by control name for exactly that reason, which is the rule
 * `./SourcesPage.tsx` already lives under — three seeded feeds share
 * one host.
 *
 * @param document - The capture as the read answered it.
 * @returns Where it can be read, or what to call one with nowhere.
 */
export function failureTitle(document: Document): string {
  return document.url ?? NO_ADDRESS_TITLE;
}

/**
 * What a row's ruling control is named to a reader who cannot see
 * which row it is in.
 *
 * Two buttons per row over a list of rows is four identical
 * accessible names on a two-row list, which is a control that says
 * what it does and not what it does it to. The visible label is the
 * first word of this by construction — it comes off
 * {@link describeFailureRuling} rather than from a literal here — so
 * the name still contains the label, which is what a reader driving
 * the page by voice depends on.
 *
 * @param ruling - The answer this control gives.
 * @param title - The capture it gives it about, as
 * {@link failureTitle} names it.
 * @returns The control name.
 */
export function failureActionName(
  ruling: FailureRuling,
  title: string,
): string {
  return `${describeFailureRuling(ruling).action} ${title}`;
}
