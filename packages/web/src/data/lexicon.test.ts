import type { Term, TermPolarity } from './types';

import { describe, expect, it } from 'vitest';

import { repeated } from '../test-support/repeated';

import { ENTITIES } from './digest';
import {
  DEFAULT_DOMAIN_SLUG,
  SPARSE_DOMAIN_SLUG,
  getDomain,
} from './domains';
import {
  CATEGORIES,
  TERMS,
  findCategory,
  getCategory,
  listCategories,
  listTerms,
  splitPolarity,
  summarizeCategories,
} from './lexicon';

/**
 * A term built here rather than taken from the table.
 *
 * {@link splitPolarity} has to report a zero for a polarity nothing
 * carries, and the fixture cannot show that: every seeded category
 * carries all three polarities on purpose, so a split taken from the
 * table has no zero in it. A locally built list is what makes the
 * absent case observable.
 *
 * @param polarity - The polarity the built term carries.
 * @returns A term differing from its neighbours in nothing else.
 */
function termWith(polarity: TermPolarity): Term {
  return {
    id: 99,
    categoryId: 99,
    pattern: 'example local probe',
    weight: 1,
    polarity,
    notes: null,
  };
}

/**
 * The key of the category a term hangs off.
 *
 * The seed names a term's category by KEY and the fixture by id, so the
 * transcription pin below has to cross that gap to compare like with
 * like.
 *
 * @param categoryId - The `categories.id` the term references.
 * @returns That category's key.
 * @throws If no fixture category carries the id.
 */
function categoryKeyOf(categoryId: number): string {
  return getCategory(categoryId).key;
}

describe('CATEGORIES', () => {
  it('carries the seed categories, in seed order', () => {
    // The transcription pin, and the non-emptiness guard every
    // table-driven claim below rests on. Content is the `categories`
    // array of `packages/service/data/categories.json`. Nothing
    // mechanically joins the two files — `@ar/web` takes no dependency
    // on `@ar/service` — so this assertion is the join, and a failure
    // means the seed and the fixture have parted company rather than
    // that a page broke. Order is the seed's, and it is the order the
    // lexicon renders its cards in.
    // Arrange / Act
    const transcribed = CATEGORIES.map((category) => ({
      key: category.key,
      name: category.name,
      parentId: category.parentId,
    }));

    // Assert
    expect(transcribed).toEqual([
      { key: 'technologies', name: 'Technologies', parentId: null },
      { key: 'phrases', name: 'Phrases', parentId: null },
      { key: 'industries', name: 'Industries', parentId: null },
    ]);
  });

  it('gives every category a distinct id', () => {
    // Terms reference a category by id, so a collision would hang one
    // bucket of vocabulary off whichever row the map happened to keep.
    // Arrange / Act
    const ids = CATEGORIES.map((category) => category.id);

    // Assert
    expect(repeated(ids)).toEqual([]);
  });

  it('gives every category a distinct key within its domain', () => {
    // `categories_domain_id_key_unique` is the pair the seed upserts on,
    // and every fixture category belongs to one domain, so a repeated
    // key here is two rows the seed could only ever write as one.
    // Arrange / Act
    const keys = CATEGORIES.map(
      (category) => `${category.domainId}/${category.key}`,
    );

    // Assert
    expect(repeated(keys)).toEqual([]);
  });

  it('never leaves a key or a name empty', () => {
    // The key is what a term names its category by and the name is what
    // the card renders; an empty either is a bucket nobody can reach or
    // read.
    // Arrange / Act
    const blank = CATEGORIES.filter(
      (category) => category.key === '' || category.name === '',
    );

    // Assert
    expect(blank).toEqual([]);
  });

  it('leaves every category a root', () => {
    // The seed ships roots only, and the service caps nesting at one
    // level with a trigger. A fixture child would be a shape the
    // lexicon page has no card for and the seed no row for.
    // Arrange / Act
    const nested = CATEGORIES.filter((category) => category.parentId !== null);

    // Assert
    expect(nested).toEqual([]);
  });

  it('belongs entirely to the seeded domain', () => {
    // The sparse domain is the shell's route to its empty states, so a
    // row leaking into it would fill a page that is meant to be bare.
    // Arrange
    const seededId = getDomain(DEFAULT_DOMAIN_SLUG).id;

    // Act
    const strays = CATEGORIES.filter(
      (category) => category.domainId !== seededId,
    );

    // Assert
    expect(strays).toEqual([]);
  });
});

describe('TERMS', () => {
  it('carries the seed terms, in seed order', () => {
    // The other half of the transcription pin, against the `terms`
    // array of `packages/service/data/terms.json`. Weight and polarity
    // are pinned together because the seed keeps them separate on
    // purpose: weight is magnitude and polarity is direction, so a row
    // whose polarity drifted would otherwise still look right.
    // Arrange / Act
    const transcribed = TERMS.map((term) => ({
      category: categoryKeyOf(term.categoryId),
      pattern: term.pattern,
      weight: term.weight,
      polarity: term.polarity,
    }));

    // Assert
    expect(transcribed).toEqual([
      {
        category: 'technologies',
        pattern: 'message queue',
        weight: 3,
        polarity: 'positive',
      },
      {
        category: 'technologies',
        pattern: 'graph database',
        weight: 2,
        polarity: 'positive',
      },
      {
        category: 'technologies',
        pattern: 'proprietary runtime',
        weight: 4,
        polarity: 'negative',
      },
      {
        category: 'technologies',
        pattern: 'framework',
        weight: 1,
        polarity: 'ignore',
      },
      {
        category: 'phrases',
        pattern: 'generally available',
        weight: 3,
        polarity: 'positive',
      },
      {
        category: 'phrases',
        pattern: 'reference implementation',
        weight: 2,
        polarity: 'positive',
      },
      {
        category: 'phrases',
        pattern: 'end of life',
        weight: 5,
        polarity: 'negative',
      },
      {
        category: 'phrases',
        pattern: 'benchmark results',
        weight: 2,
        polarity: 'ignore',
      },
      {
        category: 'industries',
        pattern: 'public sector',
        weight: 3,
        polarity: 'positive',
      },
      {
        category: 'industries',
        pattern: 'logistics',
        weight: 2,
        polarity: 'positive',
      },
      {
        category: 'industries',
        pattern: 'real estate',
        weight: 3,
        polarity: 'negative',
      },
      {
        category: 'industries',
        pattern: 'education',
        weight: 1,
        polarity: 'ignore',
      },
    ]);
  });

  it('carries the seed notes verbatim', () => {
    // The other half of the term transcription, and the half that
    // carries intent: a note is the only place a fixture records WHY a
    // row points the way it does, and prose drifts in a way a number
    // does not. In seed order, over the rows that carry one.
    // Arrange / Act
    const noted = TERMS
      .filter((term) => term.notes !== null)
      .map((term) => term.notes);

    // Assert
    expect(noted).toEqual([
      'Illustrative: this example\'s radar prefers technology it can '
        + 'run without a vendor relationship.',
      'Matches nearly every document this domain reads, so it sorts '
        + 'nothing. Kept as a row rather than deleted, so the next reader '
        + 'meets a pattern that was considered and not one that was '
        + 'missed.',
      'The strongest signal in this example: a document announcing '
        + 'one is describing something the radar can stop following.',
      'Suspended rather than removed — it turned up on both sides '
        + 'often enough to separate nothing. The weight is the one it '
        + 'carried, so restoring it is an edit to this row\'s polarity '
        + 'alone.',
      'Illustrative only. A radar narrows what it reads by naming '
        + 'sectors it is not following; the row shows that shape and '
        + 'makes no claim about the sector.',
      'Considered and left neutral: documents from this sector are '
        + 'read like any other. The row is what lets the next reader tell '
        + 'a decision from an omission.',
    ]);
  });

  it('gives every term a distinct id', () => {
    // Arrange / Act
    const ids = TERMS.map((term) => term.id);

    // Assert
    expect(repeated(ids)).toEqual([]);
  });

  it('gives every term a distinct pattern within its category', () => {
    // `terms_category_id_pattern_unique` is what the seed upserts on, so
    // two rows sharing the pair would count one match twice.
    // Arrange / Act
    const pairs = TERMS.map((term) => `${term.categoryId}/${term.pattern}`);

    // Assert
    expect(repeated(pairs)).toEqual([]);
  });

  it('points every term at a fixture category', () => {
    // A dangling reference makes the card counts silently short: the
    // term belongs to no bucket, so no bucket counts it.
    // Arrange / Act
    const dangling = TERMS.filter(
      (term) => findCategory(term.categoryId) === undefined,
    );

    // Assert
    expect(dangling).toEqual([]);
  });

  it('never leaves a pattern empty', () => {
    // An empty pattern matches everywhere or nowhere depending on the
    // matcher, and reads as a row somebody half-wrote either way.
    // Arrange / Act
    const blank = TERMS.filter((term) => term.pattern.trim() === '');

    // Assert
    expect(blank).toEqual([]);
  });

  it('keeps every weight a positive magnitude', () => {
    // The seed states that weight is magnitude only and its sign is not
    // consulted, so a negative number would mean what its positive
    // means — an invisible no-op rather than an inverted term.
    // Arrange / Act
    const offenders = TERMS.filter(
      (term) => !Number.isFinite(term.weight) || term.weight <= 0,
    );

    // Assert
    expect(offenders).toEqual([]);
  });

  it('keeps the weight of a suspended term rather than flattening it', () => {
    // The seed's stance, transcribed: an `ignore` row keeps the
    // magnitude it would carry under another polarity, so restoring it
    // is one edit of one column with no second decision to re-take. A
    // set that zeroed them would make that edit lossy and nothing else
    // here would notice.
    // Arrange / Act
    const ignored = TERMS.filter((term) => term.polarity === 'ignore');

    // Assert
    expect(ignored.length).toBeGreaterThan(0);
    expect(ignored.filter((term) => term.weight === 0)).toEqual([]);
  });

  it('carries all three polarities in every category', () => {
    // The seed exercises the whole `terms_polarity_check` set rather
    // than the two members a shorter list would reach, and the lexicon
    // card renders a split with a figure per polarity: a category
    // missing one leaves a figure nothing exercises.
    // Arrange
    const wanted: readonly TermPolarity[] = ['positive', 'negative', 'ignore'];

    // Act
    const incomplete = CATEGORIES.filter((category) => {
      const held = TERMS
        .filter((term) => term.categoryId === category.id)
        .map((term) => term.polarity);

      return wanted.some((polarity) => !held.includes(polarity));
    });

    // Assert
    expect(incomplete).toEqual([]);
  });

  it('writes notes exactly where the seed explains a direction', () => {
    // The seed's editorial rule: a term pointing away from something,
    // or deliberately weighted at nothing, says why — while a positive
    // term at an ordinary weight explains itself. Pinned because the
    // notes are the only place a fixture records intent, and a row that
    // quietly lost one reads as an omission nobody made.
    // Arrange / Act
    const mismatched = TERMS.filter(
      (term) => (term.polarity === 'positive') !== (term.notes === null),
    );

    // Assert
    expect(mismatched).toEqual([]);
  });

  it('never leaves a note empty', () => {
    // `''` is a value: a card handed one renders an explanation that
    // says nothing, where null renders none.
    // Arrange / Act
    const blank = TERMS.filter((term) => term.notes === '');

    // Assert
    expect(blank).toEqual([]);
  });
});

describe('splitPolarity', () => {
  it('counts each polarity of the list it is handed', () => {
    // Arrange
    const terms = [
      termWith('positive'),
      termWith('positive'),
      termWith('negative'),
      termWith('ignore'),
    ];

    // Act / Assert
    expect(splitPolarity(terms))
      .toEqual({ positive: 2, negative: 1, ignore: 1 });
  });

  it('reports a zero for a polarity the list does not carry', () => {
    // A card reads all three figures, so an absent polarity has to be a
    // count of none rather than a member the caller has to branch on.
    // Arrange / Act / Assert
    expect(splitPolarity([]))
      .toEqual({ positive: 0, negative: 0, ignore: 0 });
    expect(splitPolarity([termWith('ignore')]))
      .toEqual({ positive: 0, negative: 0, ignore: 1 });
  });

  it('counts every term exactly once', () => {
    // A split whose figures do not add up to the count beside them is a
    // card contradicting itself. Run over the whole table so the claim
    // covers the rows the demo actually renders.
    // Arrange / Act
    const split = splitPolarity(TERMS);
    const total = split.positive + split.negative + split.ignore;

    // Assert
    expect(TERMS.length).toBeGreaterThan(0);
    expect(total).toBe(TERMS.length);
  });
});

describe('listCategories', () => {
  it('returns the seeded domain categories in seed order', () => {
    // Arrange
    const seededId = getDomain(DEFAULT_DOMAIN_SLUG).id;

    // Act
    const listed = listCategories(seededId);

    // Assert
    expect(listed.map((category) => category.key))
      .toEqual(CATEGORIES.map((category) => category.key));
  });

  it('returns nothing for the sparse domain', () => {
    // Not an error: the empty lexicon is a state the demo reaches by
    // switching domain rather than by emptying a table.
    // Arrange
    const sparseId = getDomain(SPARSE_DOMAIN_SLUG).id;

    // Act / Assert
    expect(listCategories(sparseId)).toEqual([]);
  });

  it('returns nothing for a domain id nothing carries', () => {
    // Arrange / Act / Assert
    expect(listCategories(-1)).toEqual([]);
  });

  it('never hands back the stored table', () => {
    // Handing out the array itself would let a caller sorting it in
    // place reorder every later reader in the same process.
    // Arrange
    const seededId = getDomain(DEFAULT_DOMAIN_SLUG).id;

    // Act / Assert
    expect(listCategories(seededId)).not.toBe(CATEGORIES);
  });
});

describe('listTerms', () => {
  it('returns the terms of the named category and no others', () => {
    // Arrange
    const category = getCategory(CATEGORIES[0]?.id ?? -1);

    // Act
    const listed = listTerms(category.id);

    // Assert
    expect(listed.length).toBeGreaterThan(0);
    expect(listed.filter((term) => term.categoryId !== category.id))
      .toEqual([]);
  });

  it('returns each category terms in seed order', () => {
    // The order the seed wrote is the order an operator reads the
    // vocabulary in; nothing here re-sorts it.
    // Arrange / Act
    const listed = CATEGORIES.flatMap((category) => listTerms(category.id));

    // Assert
    expect(listed.map((term) => term.id))
      .toEqual([...TERMS].sort((a, b) => a.id - b.id).map((term) => term.id));
  });

  it('returns nothing for a category id nothing carries', () => {
    // Arrange / Act / Assert
    expect(listTerms(-1)).toEqual([]);
  });

  it('never hands back the stored table', () => {
    // Arrange
    const category = getCategory(CATEGORIES[0]?.id ?? -1);

    // Act / Assert
    expect(listTerms(category.id)).not.toBe(TERMS);
  });
});

describe('findCategory', () => {
  it('finds every fixture category by its own id', () => {
    // Arrange / Act
    const missed = CATEGORIES.filter(
      (category) => findCategory(category.id) !== category,
    );

    // Assert
    expect(missed).toEqual([]);
  });

  it('answers undefined for an id no fixture carries', () => {
    // The tolerant twin exists because a category id reaches this
    // module from the lexicon edit route, where a stale bookmark is an
    // ordinary outcome and not a broken fixture.
    // Arrange / Act / Assert
    expect(findCategory(-1)).toBeUndefined();
  });
});

describe('getCategory', () => {
  it('returns the category carrying the id', () => {
    // Arrange / Act
    const found = CATEGORIES.map((category) => getCategory(category.id));

    // Assert
    expect(found).toEqual([...CATEGORIES]);
  });

  it('throws naming the id it could not find', () => {
    // The message is what a fixture author reads first, so it carries
    // the id rather than only the fact of the miss.
    // Arrange / Act / Assert
    expect(() => getCategory(-1)).toThrow('-1');
  });
});

describe('summarizeCategories', () => {
  it('summarizes every category of the domain, in seed order', () => {
    // Arrange
    const seededId = getDomain(DEFAULT_DOMAIN_SLUG).id;

    // Act
    const summaries = summarizeCategories(seededId);

    // Assert
    expect(summaries.map((summary) => summary.category.key))
      .toEqual(CATEGORIES.map((category) => category.key));
  });

  it('counts the terms of each category', () => {
    // The figure the card renders beside the name, checked against the
    // table rather than against a number restated here.
    // Arrange
    const seededId = getDomain(DEFAULT_DOMAIN_SLUG).id;

    // Act
    const counted = summarizeCategories(seededId).map((summary) => ({
      key: summary.category.key,
      termCount: summary.termCount,
    }));

    // Assert
    expect(counted).toEqual(CATEGORIES.map((category) => ({
      key: category.key,
      termCount: TERMS.filter((term) => term.categoryId === category.id).length,
    })));
  });

  it('splits every count by polarity', () => {
    // Arrange
    const seededId = getDomain(DEFAULT_DOMAIN_SLUG).id;

    // Act
    const summaries = summarizeCategories(seededId);

    // Assert
    expect(summaries.length).toBeGreaterThan(0);
    expect(summaries.map((summary) => summary.polarity))
      .toEqual(CATEGORIES.map(
        (category) => splitPolarity(listTerms(category.id)),
      ));
  });

  it('keeps each split adding up to the count beside it', () => {
    // Arrange
    const seededId = getDomain(DEFAULT_DOMAIN_SLUG).id;

    // Act
    const contradictory = summarizeCategories(seededId).filter((summary) => {
      const { positive, negative, ignore } = summary.polarity;

      return positive + negative + ignore !== summary.termCount;
    });

    // Assert
    expect(contradictory).toEqual([]);
  });

  it('returns nothing for the sparse domain', () => {
    // Arrange
    const sparseId = getDomain(SPARSE_DOMAIN_SLUG).id;

    // Act / Assert
    expect(summarizeCategories(sparseId)).toEqual([]);
  });
});

describe('cross-module references', () => {
  it('names a fixture category on every entity that records one', () => {
    // `digest.ts` records the taxonomy bucket a subject was matched
    // under in `entities.attributes.category`, by KEY. Nothing in the
    // schema joins those two — attributes are free-form — so this is
    // the check, and it lands here because this is the first module
    // holding both halves.
    // Arrange
    const seededId = getDomain(DEFAULT_DOMAIN_SLUG).id;
    const keys = CATEGORIES
      .filter((category) => category.domainId === seededId)
      .map((category) => category.key);

    // Act
    const recorded = ENTITIES
      .map((entity) => entity.attributes.category)
      .filter((key) => key !== undefined);
    const unknown = recorded.filter(
      (key) => typeof key !== 'string' || !keys.includes(key),
    );

    // Assert
    expect(recorded.length).toBeGreaterThan(0);
    expect(unknown).toEqual([]);
  });
});
