import type { PolaritySplit } from '../../data/lexicon';
import type { TermPolarity } from '../../data/types';

import { describe, expect, it } from 'vitest';

import { repeated } from '../../test-support/repeated';

import {
  POLARITY_FACETS,
  categoryCountLabel,
  isCategoryEnabled,
  polarityShares,
  termNoun,
  withCategoryEnabled,
} from './cards';

/**
 * The polarities a card draws, in the order it draws them.
 *
 * Written out as a TYPED literal rather than derived from the module,
 * which is what makes it worth having: annotating it
 * `readonly TermPolarity[]` means a polarity dropped from the union
 * upstream reddens `check-types` here, and comparing the module's list
 * against it catches an order or membership change in the suite. The
 * opposite drift — a polarity ADDED upstream — is refused in
 * `./cards.ts` by the record the list is built from.
 */
const CARD_ORDER: readonly TermPolarity[] = ['positive', 'negative', 'ignore'];

/**
 * A split whose three counts differ and whose total is a power of two.
 *
 * Both properties are load-bearing. The counts differ so that a
 * denominator built from two of the three members — or from one of
 * them twice — cannot land on the right percentages by coincidence,
 * which is what makes the shares assertion a test of the total as
 * well. And the total is exact in IEEE, so the expected percentages
 * are exact doubles (50, 37.5, 12.5) and the assertion is about the
 * numbers rather than about rounding.
 */
const EXACT_SPLIT: PolaritySplit = {
  positive: 4,
  negative: 3,
  ignore: 1,
};

/** A category nobody has written any vocabulary for. */
const EMPTY_SPLIT: PolaritySplit = {
  positive: 0,
  negative: 0,
  ignore: 0,
};

describe('POLARITY_FACETS', () => {
  it('draws every polarity once, in card order', () => {
    // The non-emptiness guard the claims below rest on, and the order
    // claim, in one: the expected side is a literal, so an emptied or
    // reordered table cannot satisfy it.
    // Arrange / Act
    const drawn = POLARITY_FACETS.map((facet) => facet.polarity);

    // Assert
    expect(drawn).toEqual(CARD_ORDER);
    expect(repeated(drawn)).toEqual([]);
  });

  it('labels the suspended polarity for what was done with it', () => {
    // The one label that is not the column's own word: `ignore` is an
    // instruction to the matcher, and a card reports what has become
    // of the terms. Pinned against a literal, so the copy is a
    // decision this file records rather than one a rename can undo.
    // Arrange / Act
    const labels = POLARITY_FACETS.map((facet) => facet.label);

    // Assert
    expect(labels).toEqual(['Positive', 'Negative', 'Ignored']);
  });

  it('gives every polarity a label and a fill of its own', () => {
    // A blank label draws a figure nobody can read; a shared fill
    // draws two segments an operator cannot tell apart.
    // Arrange / Act
    const blank = POLARITY_FACETS.filter(
      (facet) => facet.label.trim() === '' || facet.fillClass.trim() === '',
    );
    const fills = POLARITY_FACETS.map((facet) => facet.fillClass);

    // Assert
    expect(blank).toEqual([]);
    expect(repeated(fills)).toEqual([]);
  });
});

describe('polarityShares', () => {
  it('gives each polarity its share of the whole', () => {
    // The denominator is under test here too: 4, 3 and 1 out of 8 are
    // three different percentages, so a total counting the wrong
    // members reports the wrong three.
    // Arrange / Act
    const shares = polarityShares(EXACT_SPLIT);

    // Assert
    expect(shares).toEqual({ positive: 50, negative: 37.5, ignore: 12.5 });
  });

  it('fills the bar for a category pointing one way', () => {
    // Arrange
    const split: PolaritySplit = { positive: 0, negative: 0, ignore: 6 };

    // Act
    const shares = polarityShares(split);

    // Assert
    expect(shares).toEqual({ positive: 0, negative: 0, ignore: 100 });
  });

  it('draws an empty track rather than three equal segments', () => {
    // The reading the guard exists for: an empty category has no
    // balance to show, and thirds would draw one it never struck.
    // Arrange / Act
    const shares = polarityShares(EMPTY_SPLIT);

    // Assert
    expect(shares).toEqual({ positive: 0, negative: 0, ignore: 0 });
  });

  it('spends the whole track on a category with terms', () => {
    // Arrange / Act
    const shares = polarityShares(EXACT_SPLIT);
    const spent = shares.positive + shares.negative + shares.ignore;

    // Assert
    expect(spent).toBe(100);
  });
});

describe('termNoun', () => {
  it('reads singular at exactly one term', () => {
    // Arrange / Act / Assert
    expect(termNoun(1)).toBe('term');
  });

  it('reads plural either side of one', () => {
    // Zero is the case a naive `> 1` gets wrong, and the fixtures
    // reach it: the sparse domain has categories with no terms.
    // Arrange / Act / Assert
    expect(termNoun(0)).toBe('terms');
    expect(termNoun(2)).toBe('terms');
  });
});

describe('categoryCountLabel', () => {
  it('states the count and its noun', () => {
    // Arrange / Act / Assert
    expect(categoryCountLabel(3)).toBe('3 categories');
  });

  it('reads singular at exactly one category', () => {
    // Arrange / Act / Assert
    expect(categoryCountLabel(1)).toBe('1 category');
  });

  it('states a zero rather than a word for it', () => {
    // The chip renders beside a heading whose body is an empty state,
    // and `0 categories` is the reading that agrees with it.
    // Arrange / Act / Assert
    expect(categoryCountLabel(0)).toBe('0 categories');
  });
});

describe('isCategoryEnabled', () => {
  it('reads a category nobody has touched as live', () => {
    // The baseline the absent column means: no stored flag, so a
    // category is on until an operator says otherwise.
    // Arrange / Act / Assert
    expect(isCategoryEnabled(7, new Set())).toBe(true);
  });

  it('reads a suspended category as off', () => {
    // Arrange / Act / Assert
    expect(isCategoryEnabled(7, new Set([7]))).toBe(false);
  });

  it('leaves the categories beside a suspended one alone', () => {
    // The near-miss: a delta read as a flag over the whole surface
    // rather than as a set of ids would switch these off too.
    // Arrange
    const suspended = new Set([7]);

    // Act / Assert
    expect(isCategoryEnabled(6, suspended)).toBe(true);
    expect(isCategoryEnabled(8, suspended)).toBe(true);
  });
});

describe('withCategoryEnabled', () => {
  it('records a category switched off', () => {
    // Arrange / Act
    const next = withCategoryEnabled(new Set([3]), 7, false);

    // Assert
    expect([...next].sort((a, b) => a - b)).toEqual([3, 7]);
  });

  it('forgets a category switched back on', () => {
    // Arrange / Act
    const next = withCategoryEnabled(new Set([3, 7]), 7, true);

    // Assert
    expect([...next]).toEqual([3]);
  });

  it('leaves a round trip exactly where it started', () => {
    // What makes the delta a delta rather than a log: switching a
    // category off and on again is the state nobody touched it in,
    // not a set carrying a record of the gesture.
    // Arrange
    const start: ReadonlySet<number> = new Set([3]);

    // Act
    const off = withCategoryEnabled(start, 7, false);
    const on = withCategoryEnabled(off, 7, true);

    // Assert
    expect([...on]).toEqual([...start]);
  });

  it('changes nothing when a live category is switched on', () => {
    // Arrange / Act
    const next = withCategoryEnabled(new Set([3]), 7, true);

    // Assert
    expect([...next]).toEqual([3]);
  });

  it('never writes through the delta it is given', () => {
    // The delta is React state: a set mutated in place is a new value
    // that compares equal to the old one, so the switch would move
    // and the card would not.
    // Arrange
    const start = new Set([3]);
    const before = [...start];

    // Act
    const next = withCategoryEnabled(start, 7, false);

    // Assert
    expect(next).not.toBe(start);
    expect([...start]).toEqual(before);
  });
});
