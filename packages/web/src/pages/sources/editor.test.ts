import type { SourceKind } from '../../data/types';

import { describe, expect, it } from 'vitest';

import { ALL_FILTER_VALUE } from '../filters';

import {
  readSourceEndpoint,
  readSourceKind,
  sourceKindChoices,
} from './editor';
import { SOURCE_KINDS } from './rows';

/**
 * The kinds the editor must be able to write, derived rather than
 * written out.
 *
 * `./rows.test.ts` owns the claim about what `SOURCE_KINDS` CONTAINS
 * and what order it runs in, against a typed literal. This file is
 * about whether the editor's control derived from that list or
 * quietly restated it, and a second literal here would let both files
 * be edited into agreeing about a kind the union no longer carries.
 */
const SURFACE_KINDS: readonly SourceKind[] = SOURCE_KINDS;

/**
 * The option values the control offers, widened to plain strings.
 *
 * A widening rather than a cast, and it is what lets the sentinel be
 * compared at all: `ALL_FILTER_VALUE` is a `const` with a literal
 * type, so comparing it against a `SourceKind` is TS2367 — the two
 * genuinely have no overlap — and the test that most needs writing
 * would not compile in its narrow form.
 *
 * @returns Every value the control offers, in offer order.
 */
function offeredSpellings(): readonly string[] {
  return sourceKindChoices().map((choice) => choice.value);
}

describe('sourceKindChoices', () => {
  it('offers no option that clears a filter', () => {
    // The whole difference from `kindOptions` next door: that list
    // leads with the sentinel because a filter has to be clearable,
    // and this one writes a stored column, which has no such member.
    // Arrange / Act
    const offered = offeredSpellings();

    // Assert
    expect(offered).not.toContain(ALL_FILTER_VALUE);
  });

  it('is total over the kinds the surface knows', () => {
    // Totality is what keeps `Select` from resolving a stored kind
    // nothing offered to the FIRST option — see `./editor.ts`.
    // Arrange / Act
    const offered = offeredSpellings();

    // Assert
    expect(offered).toEqual([...SURFACE_KINDS]);
  });

  it('labels every option with its stored token', () => {
    // Two names for one thing is what prose here would be: the
    // table's kind column tags each row with the token itself.
    // Arrange / Act
    const labelled = sourceKindChoices()
      .filter((choice) => choice.label !== choice.value);

    // Assert
    expect(labelled).toEqual([]);
  });

  it('builds a fresh array for every caller', () => {
    // `SelectProps.options` is declared mutable, so a shared array is
    // one component away from being edited in place.
    // Arrange / Act / Assert
    expect(sourceKindChoices()).not.toBe(sourceKindChoices());
  });
});

describe('readSourceKind', () => {
  it('refuses a value no option carries', () => {
    // Arrange / Act / Assert
    expect(readSourceKind('carrier-pigeon')).toBeUndefined();
  });

  it('refuses the filter sentinel', () => {
    // The one near miss that could plausibly arrive: it is a real
    // value on this surface, and it is not a kind.
    // Arrange / Act / Assert
    expect(readSourceKind(ALL_FILTER_VALUE)).toBeUndefined();
  });

  it('refuses text that only differs by case', () => {
    // The column stores the lowercase token, so accepting `API`
    // would write a kind no adapter is filed under.
    // Arrange / Act / Assert
    expect(readSourceKind('API')).toBeUndefined();
  });

  it('reads back every value the control offers', () => {
    // Driven off the control's own list rather than a literal, so the
    // pair stays one claim: an option the narrowing refuses would be
    // a control that writes nothing when it is chosen.
    // Arrange
    const offered = offeredSpellings();

    // Act
    const unread = offered.filter(
      (value) => readSourceKind(value) === undefined,
    );

    // Assert
    expect(unread).toEqual([]);
    expect(offered.length).toBeGreaterThan(0);
  });
});

describe('readSourceEndpoint', () => {
  it('refuses an empty field', () => {
    // Nothing type-level refuses the empty string: the column takes
    // it, and a feed pointing at nothing would save clean.
    // Arrange / Act
    const reading = readSourceEndpoint('');

    // Assert
    expect(reading.ok).toBe(false);
    expect(reading.ok
      ? ''
      : reading.sentence).toContain('cannot be blank');
  });

  it('refuses a field left as spaces', () => {
    // Trimming first is what makes this the same state as an empty
    // field rather than a second one with its own sentence.
    // Arrange / Act
    const blank = readSourceEndpoint('   ');
    const empty = readSourceEndpoint('');

    // Assert
    expect(blank).toEqual(empty);
  });

  it('says nothing about what was typed', () => {
    // The sentence states the rule, so it is the same sentence
    // whatever the field held — an operator-facing string that
    // quoted the box would be a payload in a message.
    // Arrange / Act
    const reading = readSourceEndpoint('  \t ');

    // Assert
    expect(reading.ok
      ? ''
      : reading.sentence).not.toContain('\t');
  });

  it('accepts an endpoint and hands back the trimmed one', () => {
    // Arrange / Act
    const reading = readSourceEndpoint('  https://example.org/feed.xml ');

    // Assert
    expect(reading).toEqual({
      ok: true,
      endpoint: 'https://example.org/feed.xml',
    });
  });

  it('accepts an endpoint nothing could parse as a URL', () => {
    // A `push` source names where a payload lands, and `splitEndpoint`
    // already draws an unparseable endpoint as an ordinary one. A rule
    // applied here and not there would be two answers to one question.
    // Arrange / Act
    const reading = readSourceEndpoint('hooks/inbound/public-sector');

    // Assert
    expect(reading).toEqual({
      ok: true,
      endpoint: 'hooks/inbound/public-sector',
    });
  });

  it('leaves space inside the endpoint alone', () => {
    // Only the surrounding space is invisible in the box; a space in
    // the middle is a character the operator can see and meant.
    // Arrange / Act
    const reading = readSourceEndpoint(' a b ');

    // Assert
    expect(reading).toEqual({ ok: true, endpoint: 'a b' });
  });
});
