/**
 * @packageDocumentation
 * The agents card's readings: how much of a persona's standing
 * instruction one card shows, and how the head counts them.
 *
 * Pure, and beside the page rather than inside it, for the reason
 * `../digest/rows.ts` gives: the unit suite is node-only and collects
 * `.ts` alone, so every rule worth stating lives here and the
 * component is left with one call per figure.
 *
 * ## Why the excerpt is cut here rather than in CSS
 *
 * `line-clamp-3` would be one utility and no module. It is the wrong
 * answer for this card three times over:
 *
 * - It measures the VIEWPORT. The same persona would read as an
 *   excerpt in a narrow column and as the whole prompt in a wide one,
 *   which makes what the card says a property of the window rather
 *   than of the row — and leaves the editor modal, whose job is to
 *   show the text in full, with nothing left to add on a wide screen.
 * - It hides nothing. The full system text stays in the DOM, so the
 *   eye gets three lines while a screen reader, a copy-paste and a
 *   text search all get the entire prompt: one card with two readings.
 * - Nothing can hold it. A CSS clamp is unreachable from the node unit
 *   suite, and `textContent` in a Playwright assertion returns the
 *   clamped-away half as well, so no test in this repo could tell a
 *   working clamp from a missing one.
 *
 * What the character cut costs is that a card is measured in
 * characters and drawn in lines, so a narrow card runs to more lines
 * than a wide one. That is a layout difference rather than a
 * difference in what the card SAYS, which is the trade worth making.
 *
 * ## What the cut promises
 *
 * Three rules, each one a test in `./cards.test.ts`:
 *
 * - Whitespace collapses BEFORE anything is measured, so the limit
 *   counts the text as it will be drawn rather than as it was typed —
 *   a prompt written over four lines in a textarea renders as one
 *   paragraph either way.
 * - The cut lands on a word boundary, and a word ending exactly at the
 *   limit is kept rather than dropped. A word longer than the whole
 *   limit is the one case with no boundary to find, and is cut
 *   through.
 * - Trailing punctuation goes before the ellipsis. A cut that landed
 *   after a comma or a full stop would otherwise read `you,…`, which
 *   looks like a typo rather than like a continuation.
 *
 * The excerpt is always a PREFIX of the text it came from — nothing
 * here reorders, summarises or rewrites a prompt. A card that
 * paraphrased a standing instruction would be the one kind of wrong
 * an operator could not see.
 *
 * ## The first word is load-bearing
 *
 * Every system text in `../../data/personas.ts` says `Placeholder.` in
 * its own first word, and the seed states why: a persona is normally
 * met as a row in a database with no file in view, so prose standing
 * in for a real prompt has to say so where it is READ. This card is
 * exactly that place, which makes the promise the excerpt has to keep
 * a concrete one — the limit must leave the first word intact, and
 * `./cards.test.ts` pins it rather than trusting the arithmetic.
 */

/**
 * How much of a persona's system text one card shows, in characters.
 *
 * Long enough for the placeholder marker and the sentence that says
 * what the role is for, short enough that a card stays a card: the
 * three seeded prompts run to 153-189 characters, so every one of them
 * is genuinely clamped and the excerpt is rehearsed against the prose
 * an operator will actually meet rather than against something written
 * to fit.
 *
 * A number rather than a baked-in default, because {@link excerpt}
 * takes its limit as an argument — which is what lets that function be
 * tested at boundaries without every case having to be 120 characters
 * long.
 */
export const SYSTEM_TEXT_EXCERPT_LIMIT = 120;

/**
 * What stands at the end of a clamped excerpt.
 *
 * The single character rather than three periods: it is one glyph to a
 * screen reader and to a text assertion, and it cannot be mistaken for
 * the end of a sentence the way `...` can.
 */
const ELLIPSIS = '…';

/**
 * Runs of whitespace, collapsed to one space before anything is
 * measured — see the header on why the limit counts drawn text.
 */
const WHITESPACE_RUN = /\s+/g;

/**
 * What is trimmed off the end of a cut before the ellipsis is added.
 *
 * Punctuation that separates rather than terminates, plus the full
 * stop: all of them read as a mistake immediately before an ellipsis,
 * and the ellipsis already says everything they would have.
 */
const TRAILING_PUNCTUATION = /[\s,;:.]+$/;

/**
 * The opening of a piece of text, cut to fit.
 *
 * Answers the text itself, unchanged and with no ellipsis, whenever it
 * already fits — a prompt short enough to show in full should not
 * carry a mark saying there is more.
 *
 * The limit arrives as an argument rather than being read off
 * {@link SYSTEM_TEXT_EXCERPT_LIMIT} so that the cut and the card's
 * chosen width stay separate decisions: one is a rule, the other is a
 * measurement of this particular grid.
 *
 * @param text - What the row stores, however it was typed.
 * @param limit - The most characters to keep, not counting the
 * ellipsis.
 * @returns The whole text where it fits, otherwise a prefix of it
 * ending in an ellipsis.
 */
export function excerpt(text: string, limit: number): string {
  const collapsed = text.replace(WHITESPACE_RUN, ' ').trim();

  if (collapsed.length <= limit) {
    return collapsed;
  }

  // One character PAST the limit, so that a word ending exactly at it
  // counts as a boundary rather than being the first thing dropped.
  const head = collapsed.slice(0, limit + 1);
  const boundary = head.lastIndexOf(' ');

  // `-1` — no space anywhere in the window — is the single word
  // longer than the whole limit, and it falls through to a cut through
  // the word. A boundary at index 0 cannot arise: the text is trimmed
  // above, so it never opens with a space. That is why this reads
  // `> 0` rather than `>= 0`, and why no test tells the two apart —
  // at `-1` the branches agree by arithmetic anyway, since dropping
  // the lookahead character IS the cut through the word.
  const kept = boundary > 0
    ? head.slice(0, boundary)
    : collapsed.slice(0, limit);

  return `${kept.replace(TRAILING_PUNCTUATION, '')}${ELLIPSIS}`;
}

/**
 * How the head's chip reads the size of the cast.
 *
 * One string, like `../lexicon/cards.ts`'s own count label and for the
 * same reason: a chip is one line of type at one size. It states a
 * count rather than a subset, because nothing on this surface filters.
 *
 * @param count - How many personas the domain configures.
 * @returns The chip's text.
 */
export function personaCountLabel(count: number): string {
  const noun = count === 1
    ? 'persona'
    : 'personas';

  return `${count} ${noun}`;
}
