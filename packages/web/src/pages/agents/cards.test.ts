import { describe, expect, it } from 'vitest';

import { PERSONAS } from '../../data/personas';

import {
  SYSTEM_TEXT_EXCERPT_LIMIT,
  excerpt,
  personaCountLabel,
} from './cards';

/**
 * The character a clamped excerpt ends in.
 *
 * Written out here rather than imported, because `./cards.ts` keeps it
 * private: the tests below are what pin the mark a reader sees, so a
 * change to it should have to be made twice.
 */
const ELLIPSIS = '…';

/**
 * The word every seeded system text opens with.
 *
 * The seed states the rule and this file is where the card keeps it —
 * see the header of `./cards.ts` on why a placeholder prompt has to
 * announce itself where it is read rather than where it was written.
 */
const PLACEHOLDER_MARKER = 'Placeholder.';

describe('excerpt', () => {
  it('hands back a text that fits, with no ellipsis', () => {
    // The unclamped case: a prompt short enough to show in full should
    // carry no mark saying there is more of it.
    // Arrange / Act
    const kept = excerpt('short enough', 40);

    // Assert
    expect(kept).toBe('short enough');
  });

  it('leaves a text of exactly the limit alone', () => {
    // The boundary between the two branches, which a `<` in place of
    // the `<=` would move by one character and nothing else would
    // notice.
    // Arrange
    const text = 'twelve chars';

    // Act
    const kept = excerpt(text, text.length);

    // Assert
    expect(kept).toBe(text);
    expect(kept).not.toContain(ELLIPSIS);
  });

  it('cuts on a word boundary rather than through a word', () => {
    // Arrange / Act
    // A limit falling inside `three`: the whole word goes, rather than
    // leaving a fragment that reads as a different word.
    const kept = excerpt('one two three four', 9);

    // Assert
    expect(kept).toBe(`one two${ELLIPSIS}`);
  });

  it('keeps a word that ends exactly at the limit', () => {
    // The one-character lookahead. Cutting the search window at the
    // limit itself would find the space BEFORE `cd` and drop a word
    // that fitted, which is the difference between a clamp that is
    // tight and one that is off by a word on every card.
    // Arrange / Act
    const kept = excerpt('ab cd ef', 5);

    // Assert
    expect(kept).toBe(`ab cd${ELLIPSIS}`);
  });

  it('cuts through a single word longer than the whole limit', () => {
    // No boundary to find, so the rule above has nothing to apply and
    // the cut has to fall inside the word. The alternative — an empty
    // string under a bare ellipsis — says nothing at all.
    // Arrange / Act
    const kept = excerpt('antidisestablishmentarianism', 6);

    // Assert
    expect(kept).toBe(`antidi${ELLIPSIS}`);
  });

  it('collapses whitespace before measuring, so the limit counts what is drawn', () => {
    // A prompt typed over several lines renders as one paragraph, so
    // the newlines must not spend any of the budget: counted as
    // written, this text is over the limit and would clamp.
    // Arrange
    const text = 'one\n\ntwo   three\tfour';

    // Act
    const kept = excerpt(text, 18);

    // Assert
    expect(kept).toBe('one two three four');
  });

  it('trims the leading and trailing whitespace of a text that fits', () => {
    // Arrange / Act
    const kept = excerpt('  padded out  ', 40);

    // Assert
    expect(kept).toBe('padded out');
  });

  it('drops trailing punctuation so the ellipsis reads as a continuation', () => {
    // The cut lands after the comma, and `two,…` reads as a typo
    // rather than as a sentence carrying on somewhere else.
    // Arrange / Act
    const kept = excerpt('one two, three four', 9);

    // Assert
    expect(kept).toBe(`one two${ELLIPSIS}`);
  });

  it('drops a full stop at the cut for the same reason', () => {
    // Arrange / Act
    const kept = excerpt('One. Two three.', 5);

    // Assert
    expect(kept).toBe(`One${ELLIPSIS}`);
  });

  it('never keeps more than the limit, at any limit', () => {
    // The property the card's layout rests on, checked across a ladder
    // of limits rather than at the one the page happens to pass. The
    // offenders are collected rather than counted so a failure prints
    // the limit that broke it.
    // Arrange
    const text = 'the quick brown fox jumps over the lazy dog';
    const limits = [1, 2, 3, 5, 8, 13, 21, 34, 55];

    // Act
    const offenders = limits.filter(
      (limit) => excerpt(text, limit).replace(ELLIPSIS, '').length > limit,
    );

    // Assert
    expect(limits).not.toEqual([]);
    expect(offenders).toEqual([]);
  });

  it('answers a prefix of the text it was given, never a rewrite', () => {
    // A card paraphrasing a standing instruction is the one kind of
    // wrong an operator could not see. Checked against the collapsed
    // text, since collapsing is the only edit the function makes.
    // Arrange
    const text = 'the quick brown fox jumps over the lazy dog';

    // Act
    const offenders = [4, 9, 19, 30].filter((limit) => {
      const kept = excerpt(text, limit).replace(ELLIPSIS, '');

      return !text.startsWith(kept);
    });

    // Assert
    expect(offenders).toEqual([]);
  });
});

describe('SYSTEM_TEXT_EXCERPT_LIMIT', () => {
  it('clamps every seeded persona, so the card is rehearsed against real prose', () => {
    // The limit is a measurement of this grid, and a limit no fixture
    // reaches would be one nothing has ever exercised — the clamp
    // would ship untested and arrive on the first real prompt. This is
    // also the non-emptiness guard the two cases below rest on.
    // Arrange / Act
    const unclamped = PERSONAS.filter(
      (persona) => persona.systemText.length <= SYSTEM_TEXT_EXCERPT_LIMIT,
    );

    // Assert
    expect(PERSONAS).not.toEqual([]);
    expect(unclamped).toEqual([]);
  });

  it('leaves every card still saying the prose is a placeholder', () => {
    // The promise the seed asks a reader of a ROW to keep: a card is
    // where a persona is met with no file in view, so the marker has
    // to survive the cut.
    // Arrange / Act
    const missing = PERSONAS.filter(
      (persona) => !excerpt(persona.systemText, SYSTEM_TEXT_EXCERPT_LIMIT)
        .startsWith(PLACEHOLDER_MARKER),
    );

    // Assert
    expect(missing).toEqual([]);
  });

  it('leaves every card room for more than the marker alone', () => {
    // A limit that kept the marker and nothing else would satisfy the
    // case above while saying nothing about what the role does. Every
    // card carries the marker plus a clause of its own.
    // Arrange / Act
    const bare = PERSONAS.filter((persona) => {
      const kept = excerpt(persona.systemText, SYSTEM_TEXT_EXCERPT_LIMIT);

      return kept.length <= PLACEHOLDER_MARKER.length + ELLIPSIS.length;
    });

    // Assert
    expect(bare).toEqual([]);
  });
});

describe('personaCountLabel', () => {
  it('reads singular at exactly one', () => {
    // Arrange / Act / Assert
    expect(personaCountLabel(1)).toBe('1 persona');
  });

  it('reads plural at every other count', () => {
    // Zero as well as many: a domain configuring none is a state the
    // fixtures reach on purpose, and `0 persona` would read as a
    // missing row rather than as an empty domain.
    // Arrange / Act / Assert
    expect(personaCountLabel(0)).toBe('0 personas');
    expect(personaCountLabel(3)).toBe('3 personas');
  });
});
