import type { TermPayloadEntry } from './schema';
import type { TermCandidate, TermPresentation } from './terms';
import type { Term, TermPolarity } from '../../data/types';

import { describe, expect, it } from 'vitest';

import { TERMS } from '../../data/lexicon';
import { repeated } from '../../test-support/repeated';

import {
  describeTermBlockReading,
  isDraftTerm,
  mergeTermCandidates,
  parseTermBlock,
  readTermPolarity,
  readTermPresentation,
  readTermWeight,
  splitTermBuckets,
  termPolarityOptions,
  termPresentationIndex,
  termPresentationOptions,
  toTermPayload,
  withTermPayload,
  withTermPolarity,
  withTermWeight,
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

describe('termPolarityOptions', () => {
  it('offers every bucket a term can be dragged into', () => {
    // The equivalence SC 2.5.7 asks for, as a set: a polarity the drag
    // can reach and the control cannot is the gap the criterion is
    // about, and it is invisible from either side alone.
    // Arrange
    const dragTargets = splitTermBuckets([]).map((bucket) => bucket.polarity);

    // Act
    const offered = termPolarityOptions().map((option) => option.value);

    // Assert
    expect(offered).toEqual(dragTargets);
    expect(offered).toEqual(BUCKET_ORDER);
  });

  it('labels each option the way the bucket beside it is labelled', () => {
    // Arrange
    const buckets = splitTermBuckets([]);

    // Act
    const labels = termPolarityOptions().map((option) => option.label);

    // Assert
    expect(labels).toEqual(buckets.map((bucket) => bucket.label));
    // The vacuity guard: equal empty lists would satisfy the line above.
    expect(labels.filter((label) => label !== '')).toHaveLength(3);
  });

  it('builds a fresh list per call, owned by nobody', () => {
    // The one-line form of the array-ownership stance the header states.
    // Arrange
    const first = termPolarityOptions();

    // Act
    first.push({ value: 'positive', label: 'planted' });

    // Assert
    expect(termPolarityOptions()).toHaveLength(3);
  });
});

describe('readTermPolarity', () => {
  it('answers nothing for a value no option carries', () => {
    // A default here would be this module choosing a bucket for the
    // operator, which is the one thing a narrowing must not do.
    expect(readTermPolarity('POSITIVE')).toBeUndefined();
    expect(readTermPolarity('')).toBeUndefined();
    expect(readTermPolarity('constructor')).toBeUndefined();
    expect(readTermPolarity('__proto__')).toBeUndefined();
  });

  it('answers every value the control offers', () => {
    // Driven off the option list rather than a literal, so a polarity
    // added upstream is covered here without this file being touched.
    // Arrange
    const offered = termPolarityOptions();

    // Act
    const read = offered.map((option) => readTermPolarity(option.value));

    // Assert
    expect(read).toEqual(offered.map((option) => option.value));
    expect(read).toHaveLength(3);
  });
});

describe('readTermWeight', () => {
  it('refuses a field left empty rather than reading it as zero', () => {
    // `Number('')` is `0`, so the emptiness check is what keeps a
    // weightless row out of the draft wearing a real magnitude.
    expect(readTermWeight('')).toEqual({
      ok: false,
      sentence: 'Weight is required.',
    });
    expect(readTermWeight('   ')).toEqual({
      ok: false,
      sentence: 'Weight is required.',
    });
  });

  it('refuses text that is not a number, infinities included', () => {
    // `Number('Infinity')` is a number and is not a weight, which is
    // why the guard is `Number.isFinite` and never `!Number.isNaN`.
    const unreadable = 'Weight has to be a number.';

    expect(readTermWeight('heavy'))
      .toEqual({ ok: false, sentence: unreadable });
    expect(readTermWeight('Infinity')).toEqual({
      ok: false,
      sentence: unreadable,
    });
    expect(readTermWeight('-Infinity')).toEqual({
      ok: false,
      sentence: unreadable,
    });
    expect(readTermWeight('2 kg'))
      .toEqual({ ok: false, sentence: unreadable });
  });

  it('refuses a negative weight, weight being a magnitude', () => {
    expect(readTermWeight('-2')).toEqual({
      ok: false,
      sentence: 'Weight is a magnitude; the polarity carries the direction.',
    });
  });

  it('quotes nothing an operator typed', () => {
    // The no-echo rule the header states, re-read off the OUTPUT
    // rather than trusted from the builder: a sentence goes into the
    // DOM and out again in whatever gets copied from a support thread.
    // Arrange
    const planted = 'SNTNL9';

    // Act
    const sentences = [planted, `${planted}0`, `-${planted}`]
      .map((text) => readTermWeight(text))
      .map((reading) => (reading.ok
        ? ''
        : reading.sentence));

    // Assert
    expect(sentences.filter((sentence) => sentence.includes(planted)))
      .toEqual([]);
    // The control: the sweep is only a reading if it had sentences.
    expect(sentences.filter((sentence) => sentence !== '')).toHaveLength(3);
  });

  it('agrees with a pasted line about every one of the three rules', () => {
    // The claim that makes ONE predicate worth having: a field and a
    // line refuse the same weights, so the surface cannot give two
    // answers to one question. Read as a PAIR per weight rather than
    // as two totals, which a run where both halves broke would pass.
    // Arrange
    const weights = ['', '   ', 'heavy', 'Infinity', '-2', '0', '2', '2.5'];

    // Act
    const compared = weights.map((weight) => ({
      weight,
      field: readTermWeight(weight).ok,
      line: parseTermBlock(`p | ${weight} | positive`, [])
        .sentences.length === 0,
    }));

    // Assert
    expect(compared.filter((row) => row.field !== row.line)).toEqual([]);
    // The controls: neither half may be uniformly true or uniformly
    // false, which is what a broken pair would look like above.
    expect(compared.filter((row) => row.field)).toHaveLength(3);
    expect(compared.filter((row) => !row.field)).toHaveLength(5);
  });

  it('takes a weight of zero, which is a magnitude', () => {
    expect(readTermWeight('0')).toEqual({ ok: true, weight: 0 });
    expect(readTermWeight(' 2.5 ')).toEqual({ ok: true, weight: 2.5 });
  });
});

describe('withTermWeight', () => {
  it('answers a list reading the same for an id it does not carry', () => {
    // Arrange
    const terms = [term(1, 'alpha', 'positive'), term(2, 'beta', 'negative')];

    // Act
    const next = withTermWeight(terms, 99, 5);

    // Assert
    expect(next).toEqual(terms);
    expect(next).not.toBe(terms);
  });

  it('rewrites one row and leaves the rest by identity', () => {
    // Arrange
    const alpha = term(1, 'alpha', 'positive', 1);
    const beta = term(2, 'beta', 'negative', 3);

    // Act
    const next = withTermWeight([alpha, beta], 1, 4);

    // Assert
    expect(next[0]).toEqual({ ...alpha, weight: 4 });
    expect(next[0]).not.toBe(alpha);
    expect(next[1]).toBe(beta);
  });

  it('moves no term between buckets', () => {
    // The contrast that says what the bucket rule means: weight is the
    // column `splitTermBuckets` does not read.
    // Arrange
    const terms = [term(1, 'alpha', 'positive'), term(2, 'beta', 'ignore')];
    const before = splitTermBuckets(terms);

    // Act
    const after = splitTermBuckets(withTermWeight(terms, 1, 9));

    // Assert
    expect(after.map((bucket) => bucket.terms.map((row) => row.id)))
      .toEqual(before.map((bucket) => bucket.terms.map((row) => row.id)));
    // The control: the write did land, so the equality above is about
    // the buckets and not about a no-op.
    expect(after[0]?.terms[0]?.weight).toBe(9);
  });

  it('leaves the polarity where the other mover put it', () => {
    // Arrange
    const terms = [term(1, 'alpha', 'positive')];

    // Act
    const moved = withTermPolarity(terms, 1, 'ignore');
    const weighed = withTermWeight(moved, 1, 6);

    // Assert
    expect(weighed[0]).toEqual({
      ...terms[0],
      polarity: 'ignore',
      weight: 6,
    });
  });
});

/**
 * One candidate, spelled out.
 *
 * The `term` helper's counterpart for the shape a parse answers: the
 * same four members minus the two a row has and a candidate does not.
 *
 * @param pattern - What the row would look for.
 * @param polarity - Which bucket it would join.
 * @param weight - Its magnitude.
 * @returns The candidate.
 */
function candidate(
  pattern: string,
  polarity: TermPolarity,
  weight = 1,
): TermCandidate {
  return { pattern, weight, polarity, notes: null };
}

describe('mergeTermCandidates', () => {
  it('answers a fresh list reading the same when nothing was taken', () => {
    // Act
    const next = mergeTermCandidates(MIXED, [], CATEGORY_ID);

    // Assert
    expect(next).toEqual(MIXED);
    expect(next).not.toBe(MIXED);
  });

  it('appends one row per candidate, in the order they were read', () => {
    // Arrange
    const candidates = [
      candidate('service mesh', 'positive', 2),
      candidate('edge runtime', 'negative', 3),
    ];

    // Act
    const next = mergeTermCandidates(MIXED, candidates, CATEGORY_ID);

    // Assert
    expect(next).toHaveLength(MIXED.length + 2);
    expect(next.slice(MIXED.length).map((row) => row.pattern)).toEqual([
      'service mesh',
      'edge runtime',
    ]);
  });

  it('carries every member a candidate named onto the row', () => {
    // Arrange
    const noted: TermCandidate = {
      pattern: 'service mesh',
      weight: 2.5,
      polarity: 'negative',
      notes: 'Worth watching.',
    };

    // Act
    const [row] = mergeTermCandidates([], [noted], CATEGORY_ID);

    // Assert
    expect(row).toEqual({
      id: -1,
      categoryId: CATEGORY_ID,
      pattern: 'service mesh',
      weight: 2.5,
      polarity: 'negative',
      notes: 'Worth watching.',
    });
  });

  it('mints ids below every id the list already carries', () => {
    // The claim that keeps a minted row addressable: the two movers
    // find a row by id, so an id the list already used would move two
    // rows at once.
    // Arrange
    const candidates = [candidate('service mesh', 'positive')];

    // Act
    const next = mergeTermCandidates(MIXED, candidates, CATEGORY_ID);
    const minted = next.slice(MIXED.length).map((row) => row.id);

    // Assert
    expect(minted).toEqual([-1]);
    expect(repeated(next.map((row) => row.id))).toEqual([]);
  });

  it('mints below the LOWEST id, so a second merge reuses none', () => {
    // Arrange
    const candidates = [
      candidate('service mesh', 'positive'),
      candidate('edge runtime', 'negative'),
    ];

    // Act
    const once = mergeTermCandidates(MIXED, candidates, CATEGORY_ID);
    const twice = mergeTermCandidates(
      once,
      [candidate('data mesh', 'ignore')],
      CATEGORY_ID,
    );

    // Assert
    expect(once.slice(MIXED.length).map((row) => row.id)).toEqual([-1, -2]);
    expect(twice[twice.length - 1]?.id).toBe(-3);
    expect(repeated(twice.map((row) => row.id))).toEqual([]);
  });

  it('mints from the ceiling for a category carrying nothing', () => {
    // The empty category is the panel's first subject rather than an
    // edge case: a bulk paste is how one stops being empty.
    // Act
    const next = mergeTermCandidates(
      [],
      [
        candidate('service mesh', 'positive'),
        candidate('data mesh', 'ignore'),
      ],
      CATEGORY_ID,
    );

    // Assert
    expect(next.map((row) => row.id)).toEqual([-1, -2]);
  });

  it('hangs every minted row off the category it was handed', () => {
    // Handed a DIFFERENT id from the one every row in `MIXED` carries,
    // so the assertion cannot pass by reading a neighbour's column.
    // Arrange
    const other = CATEGORY_ID + 1;

    // Act
    const next = mergeTermCandidates(
      MIXED,
      [candidate('service mesh', 'positive')],
      other,
    );

    // Assert
    expect(next[next.length - 1]?.categoryId).toBe(other);
    expect(next[0]?.categoryId).toBe(CATEGORY_ID);
  });

  it('leaves every row it was given by identity', () => {
    // Act
    const next = mergeTermCandidates(
      MIXED,
      [candidate('service mesh', 'positive')],
      CATEGORY_ID,
    );

    // Assert
    expect(next.slice(0, MIXED.length)).toEqual([...MIXED]);
    MIXED.forEach((row, index) => {
      expect(next[index]).toBe(row);
    });
  });

  it('files a merged candidate last in the bucket its polarity names', () => {
    // The composition claim: nothing here files a row into a bucket,
    // because `splitTermBuckets` reads the column and the list order.
    // Arrange
    const candidates = [candidate('service mesh', 'positive')];

    // Act
    const buckets = splitTermBuckets(
      mergeTermCandidates(MIXED, candidates, CATEGORY_ID),
    );

    // Assert
    expect(buckets[0]?.polarity).toBe('positive');
    expect(buckets[0]?.terms.map((row) => row.pattern)).toEqual([
      'message queue',
      'graph database',
      'service mesh',
    ]);
  });

  it('answers a list the caller owns outright', () => {
    // Arrange
    const candidates = [candidate('service mesh', 'positive')];

    // Act
    const next = mergeTermCandidates(MIXED, candidates, CATEGORY_ID);
    next.push(term(99, 'planted', 'ignore'));

    // Assert
    expect(mergeTermCandidates(MIXED, candidates, CATEGORY_ID))
      .toHaveLength(MIXED.length + 1);
  });
});

describe('isDraftTerm', () => {
  it('reads a stored row as one the service issued', () => {
    // `terms.id` is a positive serial, so every fixture row is one.
    expect(TERMS.every((row) => !isDraftTerm(row))).toBe(true);
    expect(isDraftTerm(term(1, 'alpha', 'positive'))).toBe(false);
  });

  it('reads back exactly what the merge minted', () => {
    // Arrange
    const candidates = [candidate('service mesh', 'positive')];

    // Act
    const next = mergeTermCandidates(MIXED, candidates, CATEGORY_ID);

    // Assert
    expect(next.filter((row) => isDraftTerm(row)).map((row) => row.pattern))
      .toEqual(['service mesh']);
  });

  it('reads the ceiling itself as neither minted nor issued', () => {
    // The boundary stated rather than left to a reader: minting counts
    // DOWN from zero, so zero is below no id this module produced.
    expect(isDraftTerm(term(0, 'alpha', 'positive'))).toBe(false);
    expect(isDraftTerm(term(-1, 'alpha', 'positive'))).toBe(true);
  });
});

describe('describeTermBlockReading', () => {
  it('says a block held nothing when neither list has a member', () => {
    expect(describeTermBlockReading({ candidates: [], sentences: [] }))
      .toBe('That block held nothing to read.');
  });

  it('states the accepted count alone when nothing was refused', () => {
    expect(describeTermBlockReading({
      candidates: [candidate('service mesh', 'positive')],
      sentences: [],
    })).toBe('Added 1 term as an unsaved row.');
    expect(describeTermBlockReading({
      candidates: [
        candidate('service mesh', 'positive'),
        candidate('edge runtime', 'negative'),
      ],
      sentences: [],
    })).toBe('Added 2 terms as unsaved rows.');
  });

  it('says it added nothing when every line was refused', () => {
    expect(describeTermBlockReading({
      candidates: [],
      sentences: ['Line 1 names no pattern.'],
    })).toBe('Added nothing and refused 1 line.');
  });

  it('states both counts when a block was partly taken', () => {
    expect(describeTermBlockReading({
      candidates: [candidate('service mesh', 'positive')],
      sentences: ['Line 2 names no pattern.', 'Line 4 names no pattern.'],
    })).toBe('Added 1 term as an unsaved row and refused 2 lines.');
  });

  it('counts what a real parse answered, over a real block', () => {
    // Driven through the producer rather than a hand-built reading, so
    // the two halves of the panel's report cannot come to disagree
    // about how many lines a block held.
    // Arrange
    const block = [
      'service mesh | 2 | positive',
      '| 1 | negative',
      'edge runtime | 3 | negative',
      'framework | 1 | ignore',
      'data mesh | 1 | ignore',
    ].join('\n');

    // Act
    const reading = parseTermBlock(block, MIXED);

    // Assert
    expect(describeTermBlockReading(reading))
      .toBe('Added 3 terms as unsaved rows and refused 2 lines.');
  });

  it('quotes nothing an operator pasted', () => {
    // The no-echo rule, re-read off the OUTPUT: this sentence carries
    // two counts and this module's own words, and the only way to
    // know is to look. The block plants a token in every field of an
    // ACCEPTED line as well as a refused one, so a builder reaching
    // for either list's contents would be caught.
    // Arrange
    const planted = 'sntnl';
    const block = [
      `${planted}pattern | 2 | positive | ${planted}notes`,
      `| 1 | ${planted}polarity`,
    ].join('\n');

    // Act
    const reading = parseTermBlock(block, MIXED);
    const sentence = describeTermBlockReading(reading);

    // Assert
    expect(sentence.match(/sntnl[a-z]*/gu)).toBeNull();
    // The control: the sweep read a sentence about a block that had
    // both a candidate and a refusal in it, not an empty one.
    expect(sentence)
      .toBe('Added 1 term as an unsaved row and refused 1 line.');
  });
});

/**
 * One payload entry, spelled out.
 *
 * The `candidate` helper's counterpart for the shape the JSON
 * fallback hands back. Typed, because an inline literal inside a
 * spread widens `polarity` to `string` and the call then reports a
 * mismatch that is the LITERAL's and not the module's.
 *
 * @param pattern - What the row looks for.
 * @param polarity - Which bucket it sits in.
 * @param weight - Its magnitude.
 * @returns The entry.
 */
function entry(
  pattern: string,
  polarity: TermPolarity,
  weight = 1,
): TermPayloadEntry {
  return { pattern, weight, polarity, notes: null };
}

describe('termPresentationOptions', () => {
  it('offers every drawing the editor can be in', () => {
    // The equivalence the pair exists for, as a set: a presentation
    // the state can hold and the control cannot reach is a drawing
    // with no way back to it, and it is invisible from either side.
    // Arrange
    const reachable: readonly TermPresentation[] = ['template', 'json'];

    // Act
    const offered = termPresentationOptions().map((option) => option.key);

    // Assert
    expect(offered).toEqual(reachable);
  });

  it('labels each option, and no two of them the same', () => {
    // Act
    const labels = termPresentationOptions().map((option) => option.label);

    // Assert
    expect(labels.filter((label) => label !== '')).toHaveLength(2);
    expect(repeated(labels)).toEqual([]);
  });

  it('builds a fresh list per call, owned by nobody', () => {
    // The one-line form of the array-ownership stance the header
    // states — and the library's control declares its `items`
    // readonly, so nothing at the call site would report a mutation.
    // Arrange
    const first = termPresentationOptions();

    // Act
    first.push({ key: 'json', label: 'planted' });

    // Assert
    expect(termPresentationOptions()).toHaveLength(2);
  });
});

describe('readTermPresentation', () => {
  it('answers nothing for a position the control never drew', () => {
    // A default here would be this module choosing a drawing for the
    // operator, which is the one thing a narrowing must not do.
    expect(readTermPresentation(-1)).toBeUndefined();
    expect(readTermPresentation(2)).toBeUndefined();
    expect(readTermPresentation(Number.NaN)).toBeUndefined();
  });

  it('round-trips every option the control offers', () => {
    // Driven off the option list rather than a literal, so a
    // presentation added upstream is covered with this file untouched.
    // Arrange
    const offered = termPresentationOptions();

    // Act
    const read = offered.map(
      (option, index) => readTermPresentation(index),
    );

    // Assert
    expect(read).toEqual(offered.map((option) => option.key));
    expect(read).toHaveLength(2);
  });
});

describe('termPresentationIndex', () => {
  it('answers the position the option list drew each presentation at', () => {
    // The two halves held against each other rather than against a
    // pair of literals: they read one order, and a test comparing each
    // to its own copy would pass while they disagreed.
    // Arrange
    const offered = termPresentationOptions();

    // Act
    const positions = offered.map((option) => termPresentationIndex(
      option.key,
    ));

    // Assert
    expect(positions).toEqual(offered.map((_option, index) => index));
  });

  it('round-trips a position back to the presentation at it', () => {
    // Arrange
    const held: TermPresentation = 'json';

    // Act
    const index = termPresentationIndex(held);

    // Assert
    expect(readTermPresentation(index)).toBe(held);
    // The vacuity guard: a pair of functions both answering the first
    // option would satisfy the line above.
    expect(index).not.toBe(0);
  });
});

describe('toTermPayload', () => {
  it('drops the two members an operator may not change', () => {
    // `id` and `categoryId` are the seam's, and their absence is the
    // payload saying which members the box may be edited over.
    // Act
    const payload = toTermPayload(MIXED);

    // Assert
    expect(payload.map((entry) => Object.keys(entry).sort())).toEqual(
      MIXED.map(() => ['notes', 'pattern', 'polarity', 'weight']),
    );
  });

  it('carries every member the row named, in the list order', () => {
    // Arrange
    const noted: Term = {
      id: 12,
      categoryId: CATEGORY_ID,
      pattern: 'service mesh',
      weight: 2.5,
      polarity: 'negative',
      notes: 'Worth watching.',
    };

    // Act
    const payload = toTermPayload([noted, term(13, 'framework', 'ignore')]);

    // Assert
    expect(payload).toEqual([
      {
        pattern: 'service mesh',
        weight: 2.5,
        polarity: 'negative',
        notes: 'Worth watching.',
      },
      { pattern: 'framework', weight: 1, polarity: 'ignore', notes: null },
    ]);
  });

  it('answers an empty payload for a category with no vocabulary', () => {
    // The state the editor opens in over an empty category, and the
    // one the schema accepts on purpose.
    expect(toTermPayload([])).toEqual([]);
  });

  it('builds a fresh list per call, owned by nobody', () => {
    // Arrange
    const first = toTermPayload(MIXED);

    // Act
    first.push({
      pattern: 'planted',
      weight: 1,
      polarity: 'ignore',
      notes: null,
    });

    // Assert
    expect(toTermPayload(MIXED)).toHaveLength(MIXED.length);
  });
});

describe('withTermPayload', () => {
  it('answers nothing at all for an emptied payload', () => {
    // A shorter payload is a REMOVAL and not an omission — the
    // payload is the whole vocabulary, and the save behind it
    // replaces the collection.
    expect(withTermPayload(MIXED, [], CATEGORY_ID)).toEqual([]);
  });

  it('drops the rows a shortened payload no longer names', () => {
    // Arrange
    const payload = toTermPayload(MIXED).slice(0, 2);

    // Act
    const next = withTermPayload(MIXED, payload, CATEGORY_ID);

    // Assert
    expect(next.map((row) => row.id)).toEqual([1, 2]);
  });

  it('answers a fresh list reading the same when nothing was edited', () => {
    // The round trip, which is what makes switching presentation
    // free: a payload read off the draft and written straight back
    // has to be the draft.
    // Act
    const next = withTermPayload(MIXED, toTermPayload(MIXED), CATEGORY_ID);

    // Assert
    expect(next).toEqual(MIXED);
    expect(next).not.toBe(MIXED);
  });

  it('keeps each row its id and category while it writes the four', () => {
    // Arrange
    const payload = toTermPayload(MIXED).map((entry) => ({
      ...entry,
      weight: entry.weight + 10,
    }));

    // Act
    const next = withTermPayload(MIXED, payload, 999);

    // Assert
    expect(next.map((row) => row.id)).toEqual(MIXED.map((row) => row.id));
    expect(next.map((row) => row.categoryId))
      .toEqual(MIXED.map((row) => row.categoryId));
    expect(next.map((row) => row.weight))
      .toEqual(MIXED.map((row) => row.weight + 10));
  });

  it('leaves the ids where they are when entries are reordered', () => {
    // Position is the only association a payload carries, so a
    // reorder moves the VOCABULARY and not the rows. Nothing is lost
    // by that: `terms` records no order.
    // Arrange
    const payload = toTermPayload(MIXED).slice()
      .reverse();

    // Act
    const next = withTermPayload(MIXED, payload, CATEGORY_ID);

    // Assert
    expect(next.map((row) => row.id)).toEqual(MIXED.map((row) => row.id));
    expect(next.map((row) => row.pattern))
      .toEqual(MIXED.map((row) => row.pattern).reverse());
  });

  it('mints ids below every id the list already carries', () => {
    // The same rule `mergeTermCandidates` mints by, so a payload's
    // additions and a paste's are the same kind of row.
    // Arrange
    const payload = [
      ...toTermPayload(MIXED),
      entry('service mesh', 'positive', 2),
      entry('edge runtime', 'negative', 3),
    ];

    // Act
    const next = withTermPayload(MIXED, payload, CATEGORY_ID);
    const added = next.slice(MIXED.length);

    // Assert
    expect(added.map((row) => row.id)).toEqual([-1, -2]);
    expect(added.every((row) => isDraftTerm(row))).toBe(true);
    expect(added.map((row) => row.categoryId))
      .toEqual([CATEGORY_ID, CATEGORY_ID]);
  });

  it('keeps descending below a list that already holds minted rows', () => {
    // Arrange
    const held = mergeTermCandidates(
      MIXED,
      [candidate('service mesh', 'positive')],
      CATEGORY_ID,
    );
    const payload = [
      ...toTermPayload(held),
      entry('edge runtime', 'negative', 3),
    ];

    // Act
    const next = withTermPayload(held, payload, CATEGORY_ID);

    // Assert
    expect(next.map((row) => row.id).slice(-2)).toEqual([-1, -2]);
    expect(repeated(next.map((row) => row.id))).toEqual([]);
  });

  it('mints against the category the editor is open on', () => {
    // Read off the argument rather than off a member of `terms`,
    // which is what leaves an empty category somewhere to get it.
    // Act
    const next = withTermPayload(
      [],
      [entry('service mesh', 'positive', 2)],
      CATEGORY_ID,
    );

    // Assert
    expect(next).toEqual([
      {
        id: -1,
        categoryId: CATEGORY_ID,
        pattern: 'service mesh',
        weight: 2,
        polarity: 'positive',
        notes: null,
      },
    ]);
  });

  it('rebuilds every row rather than writing one through', () => {
    // A row mutated in place is a new value comparing equal to the
    // old one, which renders nothing.
    // Arrange
    const payload = toTermPayload(MIXED);

    // Act
    const next = withTermPayload(MIXED, payload, CATEGORY_ID);

    // Assert
    expect(next.every((row, index) => row !== MIXED[index])).toBe(true);
  });

  it('builds a fresh list per call, owned by nobody', () => {
    // Arrange
    const payload = toTermPayload(MIXED);
    const first = withTermPayload(MIXED, payload, CATEGORY_ID);

    // Act
    first.push(term(99, 'planted', 'ignore'));

    // Assert
    expect(withTermPayload(MIXED, payload, CATEGORY_ID))
      .toHaveLength(MIXED.length);
  });
});
