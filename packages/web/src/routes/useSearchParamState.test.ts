import { describe, expect, it } from 'vitest';

import { parseSearchParam, serializeSearchParam } from './useSearchParamState';

// Only the two helpers are covered here: they are the half of the module
// that was kept pure so they could be. `useSearchParamState` itself calls
// `useSearchParams`, which needs a router context and therefore a renderer
// — it is driven through the pages that use it (see `tests/README.md` for
// the two-runner split).
//
// The fallback is the axis most of these cases turn on, so they are run
// against both shapes a call site can have: the empty fallback of a search
// box, and the sentinel of a select. A helper that treated `''` as a magic
// value rather than as one possible fallback would pass the first set and
// fail the second.

/** What a search box passes: absence and emptiness are the same thing. */
const EMPTY_FALLBACK = '';

/** What a select passes: a sentinel that must never reach the URL. */
const SENTINEL_FALLBACK = 'all';

/**
 * Values a control can hold that the helpers must carry through verbatim.
 *
 * The near-misses are the point rather than the ordinary words: a single
 * space is NOT empty, and `All` is NOT the `all` sentinel. Both would be
 * swallowed by a check that trimmed or compared case-insensitively.
 */
const VERBATIM_VALUES = [
  'adopt',
  'All',
  ' ',
  'two words',
  'punctuation/&=?#',
  'ünïcode',
];

describe('parseSearchParam', () => {
  it('reads a value the params carry', () => {
    // Arrange
    const params = new URLSearchParams('q=vector+search');

    // Act
    const value = parseSearchParam(params, 'q', EMPTY_FALLBACK);

    // Assert
    expect(value).toBe('vector search');
  });

  it('answers the fallback when the key is absent', () => {
    // Arrange
    const params = new URLSearchParams('verdict=adopt');

    // Act
    const value = parseSearchParam(params, 'category', SENTINEL_FALLBACK);

    // Assert
    expect(value).toBe(SENTINEL_FALLBACK);
  });

  it('answers the fallback when the key carries an empty value', () => {
    // `?q=` is not something this module writes — it only arrives from a
    // hand-edited address bar — and it has to mean the same as the page
    // reached without it, or one filter state would have two readings.
    // Arrange
    const params = new URLSearchParams('verdict=&q=');

    // Act
    const values = [
      parseSearchParam(params, 'verdict', SENTINEL_FALLBACK),
      parseSearchParam(params, 'q', EMPTY_FALLBACK),
    ];

    // Assert
    expect(values).toEqual([SENTINEL_FALLBACK, EMPTY_FALLBACK]);
  });

  it('carries every non-empty value through verbatim', () => {
    // No trimming and no case folding: a search box is a controlled input
    // reading back what it just wrote, so a value the parser "tidied" would
    // fight the operator's cursor on the next keystroke.
    // Arrange
    const values = VERBATIM_VALUES;

    // Act
    const round = values.map((value) => {
      const params = new URLSearchParams();

      params.set('q', value);

      return { value, parsed: parseSearchParam(params, 'q', 'all') };
    });

    // Assert
    expect(values.length).toBe(6);
    expect(round.filter((entry) => entry.parsed !== entry.value)).toEqual([]);
  });

  it('reads each key independently when several are present', () => {
    // One surface gives every control its own key, so a parser keyed on
    // position rather than name would work until the second filter.
    // Arrange
    const params = new URLSearchParams('q=rust&verdict=adopt&window=30d');

    // Act
    const values = [
      parseSearchParam(params, 'q', EMPTY_FALLBACK),
      parseSearchParam(params, 'verdict', SENTINEL_FALLBACK),
      parseSearchParam(params, 'window', SENTINEL_FALLBACK),
    ];

    // Assert
    expect(values).toEqual(['rust', 'adopt', '30d']);
  });

  it('answers with the first of a repeated key', () => {
    // Nothing here writes a repeated key, so this only pins what a
    // hand-edited address means rather than a rule the app leans on.
    // Arrange
    const params = new URLSearchParams('q=first&q=second');

    // Act
    const value = parseSearchParam(params, 'q', EMPTY_FALLBACK);

    // Assert
    expect(value).toBe('first');
  });
});

describe('serializeSearchParam', () => {
  it('writes a value that is not the fallback', () => {
    // Arrange
    const params = new URLSearchParams();

    // Act
    const next = serializeSearchParam(params, 'verdict', 'adopt', 'all');

    // Assert
    expect(next.toString()).toBe('verdict=adopt');
  });

  it('deletes the key when the value is the fallback', () => {
    // This is what keeps the unfiltered page at ONE address: a control
    // returned to its default leaves nothing behind in the URL.
    // Arrange
    const params = new URLSearchParams('verdict=adopt');

    // Act
    const next = serializeSearchParam(params, 'verdict', 'all', 'all');

    // Assert
    expect(next.toString()).toBe('');
  });

  it('deletes the key when the value is empty under a sentinel', () => {
    // The one lossy write: an empty value is stored as absence, so it
    // reads back as the sentinel rather than as an empty string.
    // Arrange
    const params = new URLSearchParams('verdict=adopt');

    // Act
    const next = serializeSearchParam(params, 'verdict', '', 'all');

    // Assert
    expect(next.toString()).toBe('');
  });

  it('writes a value that only resembles the fallback', () => {
    // The near-miss that proves the comparison is exact rather than
    // trimmed or case-folded — `All` is a value, not the `all` sentinel.
    // Arrange
    const params = new URLSearchParams();

    // Act
    const written = [
      serializeSearchParam(params, 'verdict', 'All', 'all').toString(),
      serializeSearchParam(params, 'verdict', ' all', 'all').toString(),
      serializeSearchParam(params, 'verdict', 'all ', 'all').toString(),
    ];

    // Assert
    expect(written).toEqual([
      'verdict=All',
      'verdict=+all',
      'verdict=all+',
    ]);
  });

  it('leaves every other parameter in place', () => {
    // Several controls share one surface and one query string, so a write
    // that rebuilt the params from its own key would clear its neighbours.
    // Arrange
    const params = new URLSearchParams('q=rust&verdict=adopt&window=30d');

    // Act
    const next = serializeSearchParam(params, 'verdict', 'trial', 'all');

    // Assert
    expect(next.toString()).toBe('q=rust&verdict=trial&window=30d');
  });

  it('keeps the surviving parameters in order when it deletes', () => {
    // Arrange
    const params = new URLSearchParams('q=rust&verdict=adopt&window=30d');

    // Act
    const next = serializeSearchParam(params, 'verdict', 'all', 'all');

    // Assert
    expect(next.toString()).toBe('q=rust&window=30d');
  });

  it('replaces a repeated key rather than appending to it', () => {
    // Arrange
    const params = new URLSearchParams('q=first&q=second');

    // Act
    const next = serializeSearchParam(params, 'q', 'third', '');

    // Assert
    expect(next.toString()).toBe('q=third');
  });

  it('is a no-op when it deletes a key that was never there', () => {
    // A control mounting at its default writes once before the operator
    // touches anything; that write must not change the address.
    // Arrange
    const params = new URLSearchParams('q=rust');

    // Act
    const next = serializeSearchParam(params, 'verdict', 'all', 'all');

    // Assert
    expect(next.toString()).toBe('q=rust');
  });

  it('hands back a fresh object and never writes through its argument', () => {
    // The params `useSearchParams` returns are memoized off the current
    // location: writing through them would change what the rest of the
    // render reads while the URL still said something else.
    // Arrange
    const params = new URLSearchParams('q=rust');
    const before = params.toString();

    // Act
    const next = serializeSearchParam(params, 'verdict', 'adopt', 'all');

    next.set('window', '30d');

    // Assert
    expect(next).not.toBe(params);
    expect(params.toString()).toBe(before);
  });
});

describe('parseSearchParam and serializeSearchParam together', () => {
  it('round-trips every non-empty value under an empty fallback', () => {
    // The search-box call site, where absence and emptiness coincide and
    // nothing the operator can type is lost.
    // Arrange
    const values = VERBATIM_VALUES;

    // Act
    const round = values.map((value) => ({
      value,
      parsed: parseSearchParam(
        serializeSearchParam(
          new URLSearchParams(),
          'q',
          value,
          EMPTY_FALLBACK,
        ),
        'q',
        EMPTY_FALLBACK,
      ),
    }));

    // Assert
    expect(values.length).toBe(6);
    expect(round.filter((entry) => entry.parsed !== entry.value)).toEqual([]);
  });

  it('round-trips every value except the empty one under a sentinel', () => {
    // The select call site. `''` is the single value the pair does not
    // preserve — it is written as absence and read back as the sentinel —
    // and saying so here is what makes the lossy step a decision rather
    // than a surprise a page discovers.
    // Arrange
    const values = [...VERBATIM_VALUES, SENTINEL_FALLBACK, ''];

    // Act
    const round = values.map((value) => ({
      value,
      parsed: parseSearchParam(
        serializeSearchParam(
          new URLSearchParams(),
          'verdict',
          value,
          SENTINEL_FALLBACK,
        ),
        'verdict',
        SENTINEL_FALLBACK,
      ),
    }));

    // Assert
    expect(values.length).toBe(8);
    expect(round.filter((entry) => entry.value === '')).toEqual([
      { value: '', parsed: SENTINEL_FALLBACK },
    ]);
    expect(round.filter(
      (entry) => entry.value !== '' && entry.parsed !== entry.value,
    )).toEqual([]);
  });

  it('reads the default state back from an address carrying nothing', () => {
    // Writing every control at its default produces an empty query, and
    // that empty query has to give every control its default back — the
    // property the shareable-link claim rests on.
    // Arrange
    const defaults = [
      { key: 'q', fallback: EMPTY_FALLBACK },
      { key: 'verdict', fallback: SENTINEL_FALLBACK },
      { key: 'window', fallback: SENTINEL_FALLBACK },
    ];

    // Act
    const written = defaults.reduce(
      (params, control) => serializeSearchParam(
        params,
        control.key,
        control.fallback,
        control.fallback,
      ),
      new URLSearchParams('q=rust&verdict=adopt&window=30d'),
    );
    const read = defaults.map((control) => ({
      key: control.key,
      value: parseSearchParam(written, control.key, control.fallback),
    }));

    // Assert
    expect(defaults.length).toBe(3);
    expect(written.toString()).toBe('');
    expect(read).toEqual([
      { key: 'q', value: EMPTY_FALLBACK },
      { key: 'verdict', value: SENTINEL_FALLBACK },
      { key: 'window', value: SENTINEL_FALLBACK },
    ]);
  });
});
