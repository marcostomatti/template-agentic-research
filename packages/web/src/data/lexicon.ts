/**
 * @packageDocumentation
 * The lexicon fixtures — the taxonomy a domain sorts its subject matter
 * into, and the patterns it scores documents against.
 *
 * Two tables rather than one, because the lexicon surface is the join:
 * a card is a {@link Category} plus a reading of the {@link Term}s
 * hanging off it. Keeping them apart here means the page performs the
 * same join the API endpoint will have to answer with, rather than a
 * flattened row shape invented for one page and then unpicked when the
 * API lands.
 *
 * Content is transcribed from `packages/service/data/categories.json`
 * and `packages/service/data/terms.json`, the seeds that ship with the
 * service. Transcribed rather than imported, for the reason
 * `./types.ts` redeclares the schema rather than importing it:
 * `@ar/web` has no dependency on `@ar/service` and should not take one
 * to borrow a JSON file. What that buys is a shell rehearsed against
 * the vocabulary an operator will actually meet; what it costs is that
 * nothing holds the two copies in step, so `./lexicon.test.ts` pins
 * both payloads exactly and names the seed paths beside them — a drift
 * is then a diff against a file, not a discovery.
 *
 * The seeds name their relations by natural key (`domainSlug` on a
 * category, `categoryKey` on a term) because a seed file cannot know an
 * id the database has not issued yet. Here the ids exist, so the rows
 * carry them the way the tables do and the test crosses the gap.
 *
 * Three properties of the seed are load-bearing and deliberately
 * preserved:
 *
 * - Every category is a ROOT. The service caps nesting at one level
 *   with a trigger on `categories`, and the seed ships roots only to
 *   stay on the right side of it. A flat taxonomy is also what the
 *   lexicon renders: one card per bucket, with no disclosure to open.
 * - Every category carries all THREE polarities. `ignore` is the member
 *   a shorter list would miss, and the card renders a figure per
 *   polarity, so a category short of one leaves a figure nothing
 *   exercises in the running demo.
 * - An `ignore` row keeps its WEIGHT. The seed says so explicitly:
 *   suspending or restoring a term is then one edit of one column, with
 *   no magnitude to re-decide. Flattening them to zero would make that
 *   edit lossy and would read here as though weight followed polarity,
 *   which is the one thing the two columns exist to keep apart.
 *
 * What no fixture carries is an EMPTY category, because the seed has
 * none: every bucket it ships has vocabulary in it. So a card rendering
 * a count of zero is reached from `./lexicon.test.ts` rather than from
 * the running demo. The empty state the demo does reach is the whole
 * surface: every row here belongs to the seeded domain, and the sparse
 * domain `./domains.ts` exports as `SPARSE_DOMAIN_SLUG` deliberately
 * gets none.
 *
 * The vocabulary is illustrative, like the rest of `example-tech-radar`
 * — kinds of technology rather than products, sectors rather than
 * positions on them. A term pointing away from something records the
 * example's own stated preference and is not a recommendation this
 * repository makes. Real vocabulary belongs to whoever operates an
 * instance.
 */

import type { Category, Term, TermPolarity } from './types';

import { DEFAULT_DOMAIN_SLUG, getDomain } from './domains';

/**
 * The `domains.id` every row below references.
 *
 * Read off the domain fixture rather than written as `1`, so a change
 * to the domain table moves these rows with it instead of silently
 * orphaning them. Resolving at module scope means an import of this
 * module fails loudly if the seeded domain ever goes, which is the
 * right time to hear about it: there is no half of this fixture set
 * that still means something without its domain.
 */
const SEEDED_DOMAIN_ID = getDomain(DEFAULT_DOMAIN_SLUG).id;

/**
 * How many terms of a category point each way.
 *
 * A total record rather than a partial one: every member is present and
 * a polarity nothing carries reads as `0`. A card renders all three
 * figures, so an absent member would be a branch in every caller for a
 * state that means the same as a zero.
 *
 * Typing it as a `Record` over {@link TermPolarity} rather than as three
 * named members is what makes {@link splitPolarity} exhaustive: a
 * polarity added to the union becomes a missing key the compiler
 * refuses, not a case that quietly counts nothing.
 */
export type PolaritySplit = Readonly<Record<TermPolarity, number>>;

/**
 * One lexicon card, as the page reads it.
 *
 * The category plus the two readings of its vocabulary — how much of it
 * there is, and which way it points. Assembled here rather than in the
 * page because it is the shape the API endpoint has to answer with: a
 * page counting the terms itself would need every term of every
 * category shipped to it to render a summary.
 */
export interface CategorySummary {
  /** The bucket being summarized. */
  readonly category: Category;
  /** How many terms hang off it. */
  readonly termCount: number;
  /**
   * How those terms divide by direction. Adds up to
   * {@link CategorySummary.termCount} — every term has exactly one
   * polarity.
   */
  readonly polarity: PolaritySplit;
}

/**
 * The taxonomy buckets — `categories` rows, in seed order.
 *
 * Seed order is the order the lexicon renders its cards in, so it is
 * part of what this table means rather than an accident of how it was
 * typed. Ids are stable: a term names one, and `./lexicon.test.ts`
 * fails on a reference no row answers.
 */
export const CATEGORIES: readonly Category[] = [
  {
    id: 1,
    domainId: SEEDED_DOMAIN_ID,
    key: 'technologies',
    name: 'Technologies',
    // Null on every row, and written out rather than left off: a root
    // is not a category missing a parent, it is the ordinary shape of a
    // flat taxonomy. See the module docblock for the one-level cap.
    parentId: null,
  },
  {
    id: 2,
    domainId: SEEDED_DOMAIN_ID,
    key: 'phrases',
    name: 'Phrases',
    parentId: null,
  },
  {
    id: 3,
    domainId: SEEDED_DOMAIN_ID,
    key: 'industries',
    name: 'Industries',
    parentId: null,
  },
];

/**
 * The patterns each bucket scores against — `terms` rows, in seed
 * order, grouped by the category they hang off.
 *
 * Weight is magnitude and polarity is direction; neither is inferred
 * from the other, and no row below carries a negative weight to mean
 * what its polarity already says. `notes` is written out on every row,
 * null included, so a row with nothing recorded is distinguishable from
 * a member somebody left off — and the rows carrying prose are the ones
 * whose direction would otherwise read as arbitrary.
 */
export const TERMS: readonly Term[] = [
  {
    id: 1,
    categoryId: 1,
    pattern: 'message queue',
    weight: 3,
    polarity: 'positive',
    notes: null,
  },
  {
    id: 2,
    categoryId: 1,
    pattern: 'graph database',
    weight: 2,
    polarity: 'positive',
    notes: null,
  },
  {
    id: 3,
    categoryId: 1,
    pattern: 'proprietary runtime',
    weight: 4,
    polarity: 'negative',
    notes: 'Illustrative: this example\'s radar prefers technology it can '
      + 'run without a vendor relationship.',
  },
  {
    id: 4,
    categoryId: 1,
    pattern: 'framework',
    weight: 1,
    polarity: 'ignore',
    // The first of the three reasons a row is ignored: a pattern that
    // matches nearly everything, so it sorts nothing.
    notes: 'Matches nearly every document this domain reads, so it sorts '
      + 'nothing. Kept as a row rather than deleted, so the next reader '
      + 'meets a pattern that was considered and not one that was missed.',
  },
  {
    id: 5,
    categoryId: 2,
    pattern: 'generally available',
    weight: 3,
    polarity: 'positive',
    notes: null,
  },
  {
    id: 6,
    categoryId: 2,
    pattern: 'reference implementation',
    weight: 2,
    polarity: 'positive',
    notes: null,
  },
  {
    id: 7,
    categoryId: 2,
    pattern: 'end of life',
    // The strongest weight in the set, which is what makes the digest
    // score column show a spread rather than four near-identical
    // numbers.
    weight: 5,
    polarity: 'negative',
    notes: 'The strongest signal in this example: a document announcing '
      + 'one is describing something the radar can stop following.',
  },
  {
    id: 8,
    categoryId: 2,
    pattern: 'benchmark results',
    weight: 2,
    polarity: 'ignore',
    // The second reason: suspended with its weight intact, so restoring
    // it is an edit to this row's polarity alone.
    notes: 'Suspended rather than removed — it turned up on both sides '
      + 'often enough to separate nothing. The weight is the one it '
      + 'carried, so restoring it is an edit to this row\'s polarity alone.',
  },
  {
    id: 9,
    categoryId: 3,
    pattern: 'public sector',
    weight: 3,
    polarity: 'positive',
    notes: null,
  },
  {
    id: 10,
    categoryId: 3,
    pattern: 'logistics',
    weight: 2,
    polarity: 'positive',
    notes: null,
  },
  {
    id: 11,
    categoryId: 3,
    pattern: 'real estate',
    weight: 3,
    polarity: 'negative',
    notes: 'Illustrative only. A radar narrows what it reads by naming '
      + 'sectors it is not following; the row shows that shape and makes '
      + 'no claim about the sector.',
  },
  {
    id: 12,
    categoryId: 3,
    pattern: 'education',
    weight: 1,
    polarity: 'ignore',
    // The third reason: considered and left neutral, which is what lets
    // the next reader tell a decision from an omission.
    notes: 'Considered and left neutral: documents from this sector are '
      + 'read like any other. The row is what lets the next reader tell a '
      + 'decision from an omission.',
  },
];

const CATEGORIES_BY_ID = new Map<number, Category>(
  CATEGORIES.map((category) => [category.id, category]),
);

/**
 * Look a category up by id, tolerating a miss.
 *
 * Use this where an unknown id is an ordinary outcome — the lexicon
 * edit route carries one in the URL, so a stale bookmark reaches here
 * as a number nothing answers. Where a miss would mean a broken
 * fixture instead, {@link getCategory} says so louder.
 *
 * @param id - The `categories.id` wanted.
 * @returns The category, or `undefined` if no fixture carries that id.
 */
export function findCategory(id: number): Category | undefined {
  return CATEGORIES_BY_ID.get(id);
}

/**
 * Look a category up by id, or throw.
 *
 * @param id - The `categories.id` wanted.
 * @returns The category carrying that id.
 * @throws If no fixture category carries it.
 */
export function getCategory(id: number): Category {
  const category = findCategory(id);

  if (category === undefined) {
    throw new Error(`Unknown category id: ${id}`);
  }

  return category;
}

/**
 * The taxonomy of one domain, in seed order.
 *
 * Scoped by numeric id rather than by slug: `./api.ts` is the module
 * that speaks slugs, and it resolves one through `getDomain`, whose
 * throw is where an unknown domain is refused. A domain with no
 * categories answers `[]`, which is a state the fixtures reach on
 * purpose rather than an error.
 *
 * @param domainId - The `domains.id` whose categories are wanted.
 * @returns Its categories, in seed order. Never the stored array.
 */
export function listCategories(domainId: number): readonly Category[] {
  return CATEGORIES.filter((category) => category.domainId === domainId);
}

/**
 * The vocabulary of one category, in seed order.
 *
 * Nothing re-sorts it: the order the seed wrote is the order an
 * operator reads it in, and a page wanting another one sorts the copy
 * it is handed.
 *
 * @param categoryId - The `categories.id` whose terms are wanted.
 * @returns Its terms, in seed order. Never the stored array.
 */
export function listTerms(categoryId: number): readonly Term[] {
  return TERMS.filter((term) => term.categoryId === categoryId);
}

/**
 * How a list of terms divides by direction.
 *
 * Pure and over a list rather than over a category id, so a page can
 * take a split of a filtered view — the terms an operator searched for,
 * say — without this module growing a variant per filter.
 *
 * The literal names every member of {@link TermPolarity} explicitly
 * rather than reducing into an accumulator, which is what makes the
 * count exhaustive: a polarity added to the union is a key missing from
 * the return type, and the compiler refuses it here instead of a card
 * silently rendering a total that no longer adds up.
 *
 * @param terms - The terms to divide; `[]` is a complete answer.
 * @returns A count per polarity, zeros included.
 */
export function splitPolarity(terms: readonly Term[]): PolaritySplit {
  return {
    positive: terms.filter((term) => term.polarity === 'positive').length,
    negative: terms.filter((term) => term.polarity === 'negative').length,
    ignore: terms.filter((term) => term.polarity === 'ignore').length,
  };
}

/**
 * One summary per category of a domain — what the lexicon renders.
 *
 * The join this module exists to answer: the page maps over these and
 * renders a card each, so the counting stays here and the API swap
 * replaces one accessor rather than a page.
 *
 * @param domainId - The `domains.id` whose lexicon is wanted.
 * @returns A summary per category, in seed order; `[]` for a domain
 * with no taxonomy.
 */
export function summarizeCategories(
  domainId: number,
): readonly CategorySummary[] {
  return listCategories(domainId).map((category) => {
    const terms = listTerms(category.id);

    return {
      category,
      termCount: terms.length,
      polarity: splitPolarity(terms),
    };
  });
}
