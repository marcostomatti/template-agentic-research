import type { Term, TermPolarity } from '../../data/types';

import { describe, expect, it } from 'vitest';

import { TERMS } from '../../data/lexicon';
import { repeated } from '../../test-support/repeated';

import {
  parseTermBlock,
  splitTermBuckets,
  withTermPolarity,
} from './terms';

/**
 * The buckets the editor draws, in the order it draws them.
 *
 * A TYPED literal rather than a reading of the module, for the reason
 * `./cards.test.ts` gives about its own copy: annotating it
 * `readonly TermPolarity[]` means a polarity dropped from the union
 * upstream reddens `check-types` here, and comparing the module's
 * buckets against it catches an order or membership change in the
 * suite.
 */
const BUCKET_ORDER: readonly TermPolarity[] = [
  'positive',
  'negative',
  'ignore',
];

/**
 * The `categories.id` every hand-built row below hangs off.
 *
 * One category, because every claim this file makes is about ONE
 * category's vocabulary — the split, the move and the
 * duplicate rule all read a list the editor is already scoped to.
 */
const CATEGORY_ID = 7;

/**
 * One term, spelled out.
 *
 * A helper rather than four literals per case, so a case says only
 * what it is varying. `notes` defaults to `null`, which is what the
 * seed writes for a term nobody explained.
 *
 * @param id - The `terms.id`.
 * @param pattern - What the row looks for.
 * @param polarity - Which bucket it sits in.
 * @param weight - Its magnitude.
 * @returns The row.
 */
function term(
  id: number,
  pattern: string,
  polarity: TermPolarity,
  weight = 1,
): Term {
  return {
    id,
    categoryId: CATEGORY_ID,
    pattern,
    weight,
    polarity,
    notes: null,
  };
}

/**
 * A list whose buckets interleave and whose ids do not follow order.
 *
 * Interleaved on purpose: a split that happened to be a sort would
 * pass over a list already grouped by polarity, and this one is not.
 * The ids ascend with the list rather than within a bucket, so the
 * stored order a bucket has to keep is visible in the ids themselves.
 */
const MIXED: readonly Term[] = [
  term(1, 'message queue', 'positive', 3),
  term(2, 'proprietary runtime', 'negative', 4),
  term(3, 'graph database', 'positive', 2),
  term(4, 'framework', 'ignore'),
  term(5, 'vendor lock-in', 'negative', 5),
];

/**
 * Every bucket's terms, flattened back into one list.
 *
 * @param terms - The list to split.
 * @returns The ids the split answered, bucket by bucket.
 */
function splitIds(terms: readonly Term[]): number[] {
  return splitTermBuckets(terms)
    .flatMap((bucket) => bucket.terms)
    .map((row) => row.id);
}

describe('splitTermBuckets', () => {
  it('answers one bucket per polarity, in the surface\'s order', () => {
    const buckets = splitTermBuckets(MIXED);

    expect(buckets.map((bucket) => bucket.polarity)).toEqual(BUCKET_ORDER);
  });

  it('draws each bucket with the name and colour the card uses', () => {
    const buckets = splitTermBuckets(MIXED);

    // The bucket IS a polarity, and the type says so by extending the
    // card's facet: a label or a fill invented here would be the
    // editor and the card disagreeing about what `ignore` is called.
    expect(buckets.map((bucket) => bucket.label)).toEqual([
      'Positive',
      'Negative',
      'Ignored',
    ]);
    expect(buckets.every((bucket) => bucket.fillClass !== '')).toBe(true);
  });

  it('keeps each bucket in the order the list stored it', () => {
    const buckets = splitTermBuckets(MIXED);
    const byPolarity = new Map(
      buckets.map((bucket) => [bucket.polarity, bucket.terms]),
    );

    expect(byPolarity.get('positive')?.map((row) => row.id)).toEqual([1, 3]);
    expect(byPolarity.get('negative')?.map((row) => row.id)).toEqual([2, 5]);
    expect(byPolarity.get('ignore')?.map((row) => row.id)).toEqual([4]);
  });

  it('accounts for every term exactly once', () => {
    const ids = splitIds(MIXED);

    // Both halves, because either alone is satisfiable by a broken
    // split: a total that matches says nothing about duplicates, and
    // no duplicates says nothing about a row that was dropped.
    expect([...ids].sort()).toEqual(MIXED.map((row) => row.id).sort());
    expect(repeated(ids)).toEqual([]);
  });

  it('answers an empty bucket for a polarity nothing carries', () => {
    const buckets = splitTermBuckets([term(1, 'message queue', 'positive')]);

    expect(buckets).toHaveLength(BUCKET_ORDER.length);
    expect(buckets.map((bucket) => bucket.terms.length)).toEqual([1, 0, 0]);
  });

  it('answers three empty buckets for a category with no vocabulary', () => {
    const buckets = splitTermBuckets([]);

    expect(buckets.map((bucket) => bucket.polarity)).toEqual(BUCKET_ORDER);
    expect(buckets.flatMap((bucket) => bucket.terms)).toEqual([]);
  });

  it('reads real fixture rows the way it reads a stand-in', () => {
    const seeded = TERMS.filter((row) => row.categoryId === 1);
    const buckets = splitTermBuckets(seeded);

    expect(buckets.flatMap((bucket) => bucket.terms)).toHaveLength(
      seeded.length,
    );
    expect(buckets.every((bucket) => bucket.terms.every(
      (row) => row.polarity === bucket.polarity,
    ))).toBe(true);
  });

  it('answers lists the caller owns outright', () => {
    // The array stance this module is in, asserted rather than only
    // documented: built fresh per call, owned by nobody, so a caller
    // writing through one answer cannot reach the next.
    const first = splitTermBuckets(MIXED);

    first.push(...first);
    first[0]?.terms.push(term(99, 'planted', 'positive'));

    expect(splitTermBuckets(MIXED)).toHaveLength(BUCKET_ORDER.length);
    expect(splitIds(MIXED)).not.toContain(99);
  });

  it('never writes through the list it is given', () => {
    splitTermBuckets(MIXED)[0]?.terms.push(term(98, 'planted', 'positive'));

    expect(MIXED).toHaveLength(5);
  });
});

describe('withTermPolarity', () => {
  it('rewrites the polarity of the one row named', () => {
    const moved = withTermPolarity(MIXED, 3, 'ignore');

    expect(moved.find((row) => row.id === 3)?.polarity).toBe('ignore');
    expect(moved.filter((row) => row.polarity === 'positive')).toHaveLength(1);
  });

  it('moves the row between buckets, which is the same thing', () => {
    // The claim the header rests on: a cross-bucket drag and the
    // per-term control are one operation, so the ONLY mover there is
    // has to be what changes which bucket a row is drawn in.
    const before = splitTermBuckets(MIXED);
    const after = splitTermBuckets(withTermPolarity(MIXED, 3, 'negative'));
    const idsIn = (
      buckets: readonly { readonly polarity: TermPolarity;
        readonly terms: readonly Term[] }[],
      polarity: TermPolarity,
    ): readonly number[] => buckets
      .filter((bucket) => bucket.polarity === polarity)
      .flatMap((bucket) => bucket.terms.map((row) => row.id));

    expect(idsIn(before, 'positive')).toEqual([1, 3]);
    expect(idsIn(after, 'positive')).toEqual([1]);
    expect(idsIn(after, 'negative')).toEqual([2, 3, 5]);
  });

  it('leaves the list order alone, so the row lands where stored', () => {
    const moved = withTermPolarity(MIXED, 1, 'ignore');

    // Not at the end of the bucket it joined: a bucket shows the
    // stored order, and `terms` records no drop position.
    expect(moved.map((row) => row.id)).toEqual([1, 2, 3, 4, 5]);
    expect(splitTermBuckets(moved)[2]?.terms.map((row) => row.id))
      .toEqual([1, 4]);
  });

  it('changes nothing for an id the list does not carry', () => {
    const moved = withTermPolarity(MIXED, 404, 'ignore');

    expect(moved).toEqual([...MIXED]);
  });

  it('changes nothing for a row already in that bucket', () => {
    const moved = withTermPolarity(MIXED, 4, 'ignore');

    expect(moved).toEqual([...MIXED]);
  });

  it('never writes through the list or the row it is given', () => {
    const moved = withTermPolarity(MIXED, 2, 'positive');

    expect(MIXED[1]?.polarity).toBe('negative');
    expect(moved[1]).not.toBe(MIXED[1]);
    expect(moved[0]).toBe(MIXED[0]);
  });

  it('answers a list the caller owns outright', () => {
    const moved = withTermPolarity(MIXED, 2, 'positive');

    moved.push(term(97, 'planted', 'positive'));

    expect(withTermPolarity(MIXED, 2, 'positive')).toHaveLength(MIXED.length);
  });
});

describe('parseTermBlock', () => {
  it('answers neither candidates nor sentences for an empty block', () => {
    // Every spelling of empty a textarea can hold: nothing at all, the
    // trailing newline a paste ends with, and a block of blank lines.
    // A blank line is skipped rather than refused, so none of these
    // produces a sentence about a fault nobody can correct.
    expect(parseTermBlock('', MIXED)).toEqual({
      candidates: [],
      sentences: [],
    });
    expect(parseTermBlock('\n', MIXED)).toEqual({
      candidates: [],
      sentences: [],
    });
    expect(parseTermBlock('\n  \n\t\n', MIXED)).toEqual({
      candidates: [],
      sentences: [],
    });
  });

  it('refuses a line that names no pattern, by its own line number', () => {
    const reading = parseTermBlock('| 3 | positive', MIXED);

    expect(reading.candidates).toEqual([]);
    expect(reading.sentences).toEqual(['Line 1 names no pattern.']);
  });

  it('counts blank lines when it numbers a fault', () => {
    const reading = parseTermBlock('\n\n| 3 | positive', MIXED);

    // The number is the operator's, not a count of the lines this
    // module kept: they are looking at the textarea, where the fault
    // is on the third line.
    expect(reading.sentences).toEqual(['Line 3 names no pattern.']);
  });

  it('refuses a pattern the category carries, naming its bucket', () => {
    const line = 'proprietary runtime | 4 | positive';
    const reading = parseTermBlock(line, MIXED);

    // The pattern is stored under `negative` and the line asks for
    // `positive`, and it is refused anyway: the uniqueness the service
    // holds is (category, pattern), so polarity is not part of what
    // makes two rows different.
    expect(reading.candidates).toEqual([]);
    expect(reading.sentences).toEqual([
      'Line 1 repeats a pattern the negative bucket already carries.',
    ]);
  });

  it('refuses a pattern an earlier line of the same block took', () => {
    const reading = parseTermBlock(
      ['service mesh | 2 | positive', 'service mesh | 3 | negative']
        .join('\n'),
      MIXED,
    );

    expect(reading.candidates).toHaveLength(1);
    expect(reading.sentences)
      .toEqual(['Line 2 repeats the pattern on line 1.']);
  });

  it('tells both duplicate lines about the category, not each other', () => {
    const reading = parseTermBlock(
      ['framework | 1 | ignore', 'framework | 2 | positive'].join('\n'),
      MIXED,
    );

    // A refused line never enters the accepted set, so the second
    // repeat is pointed at the category rather than at a first line
    // that was itself turned away.
    expect(reading.sentences).toEqual([
      'Line 1 repeats a pattern the ignore bucket already carries.',
      'Line 2 repeats a pattern the ignore bucket already carries.',
    ]);
  });

  it('refuses a weight that is not a number', () => {
    const reading = parseTermBlock('service mesh | heavy | positive', MIXED);

    expect(reading.candidates).toEqual([]);
    expect(reading.sentences).toEqual([
      'Line 1 states a weight that is not a number.',
    ]);
  });

  it('refuses the weights a bare Number() would have taken', () => {
    const block = [
      'service mesh |  | positive',
      'edge runtime | Infinity | positive',
      'data mesh | -3 | positive',
    ].join('\n');
    const reading = parseTermBlock(block, MIXED);

    // An empty field is the one that matters: `Number('')` is `0`,
    // so a check that only asked whether the text parsed would file a
    // weightless line as a zero-weight term.
    expect(reading.candidates).toEqual([]);
    expect(reading.sentences).toEqual([
      'Line 1 states no weight.',
      'Line 2 states a weight that is not a number.',
      'Line 3 states a negative weight, where weight is a magnitude and '
        + 'the polarity carries the direction.',
    ]);
  });

  it('refuses a polarity outside the three, and offers all three', () => {
    const reading = parseTermBlock('service mesh | 2 | neutral', MIXED);

    expect(reading.sentences).toEqual([
      'Line 1 names a polarity outside positive, negative or ignore.',
    ]);
  });

  it('refuses a line carrying too few or too many fields', () => {
    const block = [
      'service mesh | 2',
      'service mesh | 2 | positive | why | and more',
    ].join('\n');
    const reading = parseTermBlock(block, MIXED);

    expect(reading.candidates).toEqual([]);
    expect(reading.sentences).toEqual([
      'Line 1 carries 2 fields, where the format is '
        + 'pattern | weight | polarity and notes are optional.',
      'Line 2 carries 5 fields, where the format is '
        + 'pattern | weight | polarity and notes are optional.',
    ]);
  });

  it('reports one sentence per line, stopping at the first fault', () => {
    // The line is wrong three ways over. One sentence, so the count of
    // sentences is the count of lines to go and look at.
    const reading = parseTermBlock('| heavy | neutral', MIXED);

    expect(reading.sentences).toHaveLength(1);
    expect(reading.sentences).toEqual(['Line 1 names no pattern.']);
  });

  it('quotes nothing an operator pasted', () => {
    const planted = 'sntnlpattern';
    const block = [
      `| 3 | ${planted}note`,
      `${planted}weight | sntnlheavy | positive`,
      `${planted}pol | 2 | sntnlneutral`,
      `${planted}dup | 1 | positive | sntnlnotes`,
      `${planted}dup | 1 | negative`,
      `${planted}count | 2 | positive | a | b`,
    ].join('\n');
    const reading = parseTermBlock(block, MIXED);
    const leaked = reading.sentences
      .join(' ')
      .match(/sntnl[a-z]*/gu);

    // Read back with a second matcher rather than trusted to the
    // builder's own care: a sentence assembled from a line number,
    // a field name and this module's vocabulary cannot carry a
    // planted token, and the only way to know is to look.
    //
    // Five of the six lines are refused and every refusal shape is
    // among them. The fourth is ACCEPTED on purpose: it is what gives
    // the fifth a duplicate to be refused against, so the sweep
    // reaches the one sentence that names another line.
    expect(reading.candidates).toHaveLength(1);
    expect(reading.sentences).toHaveLength(5);
    expect(leaked).toBeNull();
  });

  it('finds a leak that the same reader is pointed at', () => {
    // The control the sweep above rests on: without it, a reader that
    // had stopped matching would report a clean run over sentences
    // carrying every token.
    const leaked = ['Line 1 quoted sntnlpattern back'].join(' ')
      .match(/sntnl[a-z]*/gu);

    expect(leaked).toEqual(['sntnlpattern']);
  });

  it('accepts a well-formed line, in the seed\'s own member order', () => {
    const reading = parseTermBlock(
      'service mesh | 2 | positive | Worth watching.',
      MIXED,
    );

    expect(reading.sentences).toEqual([]);
    expect(reading.candidates).toEqual([{
      pattern: 'service mesh',
      weight: 2,
      polarity: 'positive',
      notes: 'Worth watching.',
    }]);
  });

  it('takes a line with no notes, and writes the column\'s null', () => {
    const reading = parseTermBlock('service mesh | 2 | positive', MIXED);

    expect(reading.candidates[0]?.notes).toBeNull();
    expect(parseTermBlock('service mesh | 2 | positive |', MIXED)
      .candidates[0]?.notes).toBeNull();
  });

  it('reads a tab-separated line the way it reads a piped one', () => {
    const piped = parseTermBlock('service mesh | 2 | positive', MIXED);
    const tabbed = parseTermBlock('service mesh\t2\tpositive', MIXED);

    expect(tabbed).toEqual(piped);
  });

  it('trims the spacing a paste arrives with', () => {
    const line = '   service mesh  |  2  |  positive  ';
    const reading = parseTermBlock(line, MIXED);

    expect(reading.candidates).toEqual([{
      pattern: 'service mesh',
      weight: 2,
      polarity: 'positive',
      notes: null,
    }]);
  });

  it('reads a block whose lines end the way Windows ends them', () => {
    const reading = parseTermBlock('service mesh | 2 | positive\r\n', MIXED);

    expect(reading.sentences).toEqual([]);
    expect(reading.candidates[0]?.polarity).toBe('positive');
  });

  it('keeps the accepted lines and reports only the refused ones', () => {
    const block = [
      'service mesh | 2 | positive',
      '| 1 | negative',
      'edge runtime | 3 | negative | Illustrative.',
      'framework | 1 | ignore',
      'data mesh | 1 | ignore',
    ].join('\n');
    const reading = parseTermBlock(block, MIXED);

    expect(reading.candidates.map((row) => row.pattern)).toEqual([
      'service mesh',
      'edge runtime',
      'data mesh',
    ]);
    expect(reading.sentences).toEqual([
      'Line 2 names no pattern.',
      'Line 4 repeats a pattern the ignore bucket already carries.',
    ]);
  });

  it('answers lists the caller owns outright', () => {
    const reading = parseTermBlock('service mesh | 2 | positive', MIXED);

    reading.candidates.push({
      pattern: 'planted',
      weight: 1,
      polarity: 'positive',
      notes: null,
    });
    reading.sentences.push('planted');

    const again = parseTermBlock('service mesh | 2 | positive', MIXED);

    expect(again.candidates).toHaveLength(1);
    expect(again.sentences).toEqual([]);
  });

  it('takes a pattern nothing stores, whatever the category holds', () => {
    const reading = parseTermBlock('service mesh | 2 | positive', []);

    expect(reading.sentences).toEqual([]);
    expect(reading.candidates).toHaveLength(1);
  });
});
