/**
 * @packageDocumentation
 * The lexicon card's readings: how one category's vocabulary divides,
 * how that division is drawn, and what the card's toggle means while
 * nothing stores what it says.
 *
 * Pure, and beside the page rather than inside it, for the reason
 * `../digest/rows.ts` gives: the unit suite is node-only and collects
 * `.ts` alone, so every rule worth stating lives here and the
 * component is left with one `.map` per figure.
 *
 * ## One table for the three polarities
 *
 * {@link POLARITY_FACETS} is the whole of what a card knows about a
 * polarity — what to call it, and what to draw it in — and it is
 * derived from a record keyed by `TermPolarity`. A polarity added to
 * the union is then a key the compiler demands rather than a figure
 * that quietly stops being drawn beneath a total that still counts it.
 * The entries carry no polarity of their own: the key is attached
 * while the ordered list is built, so an entry cannot end up
 * contradicting the key it is filed under.
 *
 * The ORDER is the card's rather than the union's, and it is a reading
 * of the taxonomy: what a domain is looking for, then what it is
 * looking away from, then what it has decided not to sort on. A record
 * has no order a render may rely on, which is why the list exists at
 * all — and why `./cards.test.ts` pins the two against each other.
 *
 * ## The bar and the numbers come from the same counts
 *
 * A card says the split twice: three figures an operator can read, and
 * one bar they can compare against the card beside it without reading
 * anything. Both are the same three numbers — {@link polarityShares}
 * derives the widths, and nothing derives a figure from a width — so
 * no rounding of the drawing can change what the card says.
 *
 * The denominator is the split's own sum ({@link polarityTotal}) and
 * NOT `CategorySummary.termCount`, even though `../../data/lexicon.ts`
 * says the two agree. If they ever stop agreeing, a bar that falls
 * short of its track shows it; a bar measured against the other total
 * would overflow the track and hide it.
 *
 * ## The toggle stores nothing, and says so
 *
 * `categories` carries NO enabled column. Not narrowed away like the
 * pipeline internals `../../data/types.ts` documents dropping —
 * absent: nothing in schema v2 records that an operator has suspended
 * a bucket, and neither does `domains.settings`, which is per-domain
 * configuration rather than a per-category flag.
 *
 * So the card's `Switch` is answered here the way every parent-owned
 * control in this app is: as a DELTA over a baseline, held for the
 * life of the tab and written nowhere. The baseline is that every
 * category is live, because that is what the absent column means, and
 * {@link SuspendedCategories} is the set of ids an operator has
 * switched off since the page mounted. Switching one back on removes
 * it, so the delta empties rather than accumulating a record of every
 * gesture.
 *
 * Inventing a fixture column instead would have been the quiet
 * mistake: it would read as a schema decision already taken, and the
 * API swap would meet an endpoint with nothing to answer it. What this
 * shape says instead is that the decision is still open — a
 * `categories.enabled` column, or a suspension list under the domain's
 * settings — and that the shell is ready for either.
 */

import type { PolaritySplit } from '../../data/lexicon';
import type { TermPolarity } from '../../data/types';

/**
 * How one polarity is labelled and drawn on this surface.
 *
 * Named for the card because that is where it started, and read by
 * the editor too: `./terms.ts` extends it into a bucket, so a
 * polarity is called and coloured the same thing in both places.
 */
export interface PolarityFacet {
  /** Which polarity this reads. */
  readonly polarity: TermPolarity;
  /** What the figure is called, in the surface's own words. */
  readonly label: string;
  /**
   * The Tailwind background utility the dot and the bar segment share.
   *
   * A background rather than a text colour because neither element it
   * reaches carries text: the meaning is in the label beside it, and
   * the colour is what makes two cards comparable at a glance.
   */
  readonly fillClass: string;
}

/**
 * What each polarity reads as, keyed by the polarity itself.
 *
 * Total over {@link TermPolarity} — that is the whole reason it is a
 * record rather than a list — and the entries omit the key, so the
 * derived list below is the only place a polarity and its facet are
 * joined.
 *
 * `Ignored` rather than `ignore`: the column stores an instruction to
 * the matcher, and the card reports what has been done with the terms.
 */
const POLARITY_FACET_BODIES: Readonly<
  Record<TermPolarity, Omit<PolarityFacet, 'polarity'>>
> = {
  positive: { label: 'Positive', fillClass: 'bg-success' },
  negative: { label: 'Negative', fillClass: 'bg-danger' },
  // Muted rather than a fourth hue: an ignored term is the absence of
  // a direction, and giving it a colour of its own would read as a
  // third one.
  ignore: { label: 'Ignored', fillClass: 'bg-fg3' },
};

/**
 * The order this surface lists the three readings in.
 *
 * Private, and the only reason it exists is that a record has no order
 * — see the header on what the order means.
 */
const POLARITY_ORDER: readonly TermPolarity[] = [
  'positive',
  'negative',
  'ignore',
];

/**
 * The three readings the surface draws, in its own order.
 *
 * What the card maps over: one dot, one label and one bar segment
 * per member, with the count read off the split by
 * {@link PolarityFacet.polarity}. `./terms.ts` maps over the same
 * list for the editor's three buckets, so the order is declared here
 * once rather than in each surface that draws it.
 */
export const POLARITY_FACETS: readonly PolarityFacet[] = POLARITY_ORDER
  .map((polarity) => ({ polarity, ...POLARITY_FACET_BODIES[polarity] }));

/**
 * How much of a category's vocabulary points each way, as percentages
 * of the whole.
 *
 * The same shape as {@link PolaritySplit} and deliberately a different
 * type: one carries terms and the other carries the width of a bar
 * segment, and a page handed the wrong one would render a plausible
 * picture of nothing.
 */
export type PolarityShares = Readonly<Record<TermPolarity, number>>;

/**
 * The categories an operator has switched off since the page mounted.
 *
 * A set of `categories.id`, empty at mount, and the delta over a
 * baseline where every category is live — see the header on why that
 * baseline is the honest reading of a column the schema does not have.
 */
export type SuspendedCategories = ReadonlySet<number>;

/**
 * How many terms a split accounts for.
 *
 * Written as a sum of the three members rather than a fold over the
 * record, so a polarity added to {@link TermPolarity} is a member this
 * function visibly does not count — a fold would go on returning a
 * number, just the wrong one.
 *
 * Private, and the card shows `CategorySummary.termCount` instead: the
 * only thing this total is for is the denominator below, and a page
 * given both would have two totals to keep in step.
 *
 * @param split - The counts, as `../../data/lexicon` reports them.
 * @returns Their total; `0` for a category with no vocabulary.
 */
function polarityTotal(split: PolaritySplit): number {
  return split.positive + split.negative + split.ignore;
}

/**
 * One segment's share of the bar.
 *
 * Guards `<= 0` rather than `=== 0` because either way out is the same
 * answer and only one of them is reachable by arithmetic: a zero total
 * would make every share `NaN`, and a negative one — which no count
 * can produce, but a future derived total could — would make them
 * negative widths.
 *
 * @param count - How many terms point this way.
 * @param total - How many the category has in all.
 * @returns The share, as a percentage.
 */
function share(count: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return (count / total) * 100;
}

/**
 * The three bar segments, as percentages of the card's whole.
 *
 * Unrounded on purpose: a bar is drawn in CSS, which is happy with a
 * third of a track, and three rounded percentages are the shape that
 * adds up to 99 or 101 and leaves a seam at the end of the bar.
 *
 * A category with no terms answers zeros rather than thirds — an empty
 * track is the honest picture of nothing, where three equal segments
 * would draw a balance that was never struck.
 *
 * The literal names every member of {@link TermPolarity} for the
 * reason {@link polarityTotal} is a sum: the compiler is what makes
 * this exhaustive.
 *
 * @param split - The counts, as `../../data/lexicon` reports them.
 * @returns A percentage per polarity, summing to 100 unless the
 * category is empty.
 */
export function polarityShares(split: PolaritySplit): PolarityShares {
  const total = polarityTotal(split);

  return {
    positive: share(split.positive, total),
    negative: share(split.negative, total),
    ignore: share(split.ignore, total),
  };
}

/**
 * The noun a count of terms takes.
 *
 * Split from its number rather than returned with one, unlike
 * {@link categoryCountLabel}, because the card sets the figure in a
 * larger face than the word beside it — a single string would have to
 * be taken apart again to do that.
 *
 * @param count - How many terms.
 * @returns The noun, singular at exactly one.
 */
export function termNoun(count: number): string {
  return count === 1
    ? 'term'
    : 'terms';
}

/**
 * How the head's chip reads the size of the taxonomy.
 *
 * One string, unlike {@link termNoun}, because a chip is one line of
 * type at one size. It states a count rather than a subset — nothing
 * on this surface filters — where the digest's chip has to say what it
 * is a subset of.
 *
 * @param count - How many categories the domain has.
 * @returns The chip's text.
 */
export function categoryCountLabel(count: number): string {
  const noun = count === 1
    ? 'category'
    : 'categories';

  return `${count} ${noun}`;
}

/**
 * Whether a category is live, given what the operator has switched
 * off.
 *
 * Phrased as the absence of a suspension rather than the presence of a
 * flag, which is the baseline the header describes: a category nobody
 * has touched is live, and so is one that has been switched off and
 * back on.
 *
 * @param categoryId - The `categories.id` being drawn.
 * @param suspended - What the operator has switched off.
 * @returns Whether its switch reads on.
 */
export function isCategoryEnabled(
  categoryId: number,
  suspended: SuspendedCategories,
): boolean {
  return !suspended.has(categoryId);
}

/**
 * The delta after an operator moves one card's switch.
 *
 * Always a fresh set, never the one it was given: the delta is React
 * state, and a set mutated in place is a new value that compares equal
 * to the old one and renders nothing.
 *
 * Switching a category back on REMOVES it rather than recording that
 * it is on, so a round trip leaves the delta exactly as it found it —
 * which is what keeps "nothing has been suspended" and "everything
 * suspended has been restored" the same state, as they will have to be
 * the day this is written through to an endpoint.
 *
 * @param suspended - The delta as it stands.
 * @param categoryId - The `categories.id` whose switch moved.
 * @param enabled - Where the switch now reads.
 * @returns The new delta.
 */
export function withCategoryEnabled(
  suspended: SuspendedCategories,
  categoryId: number,
  enabled: boolean,
): SuspendedCategories {
  const next = new Set(suspended);

  if (enabled) {
    next.delete(categoryId);
  } else {
    next.add(categoryId);
  }

  return next;
}
