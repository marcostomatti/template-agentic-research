import { describe, expect, it } from 'vitest';

import { repeated } from './repeated';

describe('repeated', () => {
  it('returns nothing when every value is distinct', () => {
    // The case every distinctness assertion in the suite is written
    // against, so it has to be the empty array rather than a falsy
    // value a `toEqual([])` would also accept.
    // Arrange / Act / Assert
    expect(repeated(['a', 'b', 'c'])).toEqual([]);
  });

  it('returns nothing for an empty list', () => {
    // Worth pinning because it is exactly the vacuous case: a caller
    // mapping over an emptied table gets `[]` here and passes, which is
    // why every table in this package also carries a non-emptiness
    // test of its own.
    // Arrange / Act / Assert
    expect(repeated([])).toEqual([]);
  });

  it('returns each occurrence after the first', () => {
    // The first occurrence is the row that is fine; the later ones are
    // the collisions a reader has to go and look at.
    // Arrange / Act / Assert
    expect(repeated([1, 2, 1, 3, 2, 1])).toEqual([1, 2, 1]);
  });

  it('reports a value repeated across a long run once per extra copy', () => {
    // Arrange / Act / Assert
    expect(repeated(['x', 'x', 'x'])).toEqual(['x', 'x']);
  });

  it('compares values by identity, not by shape', () => {
    // Two objects with the same contents are two values here. The
    // helper is used on ids, slugs, paths and hashes for that reason —
    // handing it rows would report nothing however many of them match.
    // Arrange
    const rows = [{ id: 1 }, { id: 1 }];

    // Act / Assert
    expect(repeated(rows)).toEqual([]);
  });
});
