import { describe, expect, it } from 'vitest';

import { NAV_ITEMS, NAV_TITLES } from './nav';

// The nav table is the seed the route surface table is derived from, so the
// invariants worth pinning here are the ones a route builder would inherit
// silently: ids that collide, and ids that are not usable as a path segment.
const ROUTE_SEGMENT = /^[a-z][a-z0-9-]*$/;

describe('NAV_ITEMS', () => {
  it('gives every surface a distinct id', () => {
    // Arrange
    const ids = NAV_ITEMS.map((item) => item.id);

    // Act
    const distinct = new Set(ids);

    // Assert
    expect(distinct.size).toBe(ids.length);
  });

  it('gives every surface an id usable as a route segment', () => {
    // Arrange
    const ids = NAV_ITEMS.map((item) => item.id);

    // Act
    const malformed = ids.filter((id) => !ROUTE_SEGMENT.test(id));

    // Assert
    expect(malformed).toEqual([]);
  });

  it('gives every surface a non-empty label', () => {
    // Arrange / Act
    const unlabelled = NAV_ITEMS.filter((item) => item.label.trim() === '');

    // Assert
    expect(unlabelled).toEqual([]);
  });
});

describe('NAV_TITLES', () => {
  it('maps each nav id onto its own label', () => {
    // Arrange / Act
    const mismatched = NAV_ITEMS.filter(
      (item) => NAV_TITLES[item.id] !== item.label,
    );

    // Assert
    expect(mismatched).toEqual([]);
  });

  it('keeps one entry per nav item', () => {
    // A duplicate id would collapse two surfaces onto one key here rather
    // than raising, so the count is the only place that failure surfaces.
    // Arrange / Act
    const titleCount = Object.keys(NAV_TITLES).length;

    // Assert
    expect(titleCount).toBe(NAV_ITEMS.length);
  });
});
