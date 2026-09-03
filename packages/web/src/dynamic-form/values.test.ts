import type { NodePath } from './nodePath';

import { describe, expect, it } from 'vitest';

import {
  childPath,
  indexSegment,
  keySegment,
  ROOT_PATH,
} from './nodePath';
import {
  readValueAt,
  withListReordered,
  withValueAt,
} from './values';

/**
 * The structure every case below reads or writes.
 *
 * Modelled on the Lexicon payload the swap actually hands over, so
 * the nesting these cases walk is the nesting v1 ships. Three things
 * are deliberate. `notes` holds `null` on one term, which is what a
 * cleared box writes and the one value an absent-read must not be
 * confused with. `notes` is ABSENT from the other, which is the
 * member a form is allowed to create. And `aliases` is a list of
 * leaves, so a list position exists that no term object backs.
 *
 * A function rather than a constant: every write case needs a value
 * nothing earlier in the file could have touched, and the untouched
 * readings below are worth nothing if two cases share one object.
 *
 * @returns A fresh structure, equal to every other call's.
 */
function group(): unknown {
  return {
    name: 'Weather',
    terms: [
      { pattern: 'rain', weight: 2, notes: null },
      { pattern: 'storm', weight: 5 },
    ],
    aliases: ['wet', 'damp'],
  };
}

/** The list of terms. */
const TERMS: NodePath = childPath(ROOT_PATH, keySegment('terms'));

/** The first term, whose `notes` holds `null`. */
const FIRST: NodePath = childPath(TERMS, indexSegment(0));

/** The second term, which has no `notes` member at all. */
const SECOND: NodePath = childPath(TERMS, indexSegment(1));

/** A leaf three segments down, the deepest write these cases make. */
const SECOND_PATTERN: NodePath = childPath(
  SECOND,
  keySegment('pattern'),
);

/** The first term's `notes`, present and holding `null`. */
const FIRST_NOTES: NodePath = childPath(FIRST, keySegment('notes'));

/** The list of leaves, which no drill-in reaches. */
const ALIASES: NodePath = childPath(
  ROOT_PATH,
  keySegment('aliases'),
);

/**
 * A deep snapshot of a value, for the untouched readings.
 *
 * `JSON.stringify` rather than a structural walk: it is one reading
 * of the whole structure including key order, and an in-place write
 * anywhere under it moves the string.
 *
 * @param value - The value to snapshot.
 * @returns Its serialisation.
 */
function snapshot(value: unknown): string {
  return JSON.stringify(value);
}

/**
 * What sits at a path, with the absent answer raised rather than
 * absorbed.
 *
 * A bare {@link readValueAt} at each call site would let a case
 * about a written value pass against nothing at all, which is what
 * these cases are checking.
 *
 * @param value - The structure to read.
 * @param path - The position to read.
 * @returns What sits there.
 * @throws If the path names no position.
 */
function requireAt(value: unknown, path: NodePath): unknown {
  const found = readValueAt(value, path);

  if (found === undefined) {
    throw new Error('No value at the path');
  }

  return found;
}

describe('what a write refuses', () => {
  it('refuses a write descending through a leaf', () => {
    const value = group();
    const below = childPath(SECOND_PATTERN, keySegment('deeper'));

    // `pattern` holds a string, so there is no container to rebuild
    // under it and no def in hand to say what one would be.
    expect(withValueAt(value, below, 'x')).toBe(value);

    // The control for the axis: the same walk stopping AT `pattern`
    // lands, so what the refusal reports is the descent and not the
    // depth.
    expect(withValueAt(value, SECOND_PATTERN, 'x')).not.toBe(value);
  });

  it('refuses an index into something that is not a list', () => {
    const value = group();
    const indexed = childPath(
      childPath(ROOT_PATH, keySegment('name')),
      indexSegment(0),
    );

    expect(withValueAt(value, indexed, 'x')).toBe(value);

    // The control for the axis: an index segment at a position that
    // IS a list lands.
    const alias = childPath(ALIASES, indexSegment(0));

    expect(withValueAt(value, alias, 'x')).not.toBe(value);
  });

  it('refuses an index the list does not hold', () => {
    const value = group();
    const cases: readonly number[] = [2, 7, -1, 1.5, Number.NaN];

    // Every shape of "not a position of this two-item list": past
    // the end, negative, fractional, and the one that fails every
    // comparison rather than being caught by a bound.
    cases.forEach((index) => {
      const path = childPath(TERMS, indexSegment(index));

      expect(withValueAt(value, path, 'x')).toBe(value);
    });

    // The control for the axis: the last position it does hold.
    expect(withValueAt(value, SECOND, 'x')).not.toBe(value);
  });

  it('refuses a descent through an absent member', () => {
    const value = group();
    const absent = childPath(ROOT_PATH, keySegment('missing'));
    const below = childPath(absent, keySegment('inner'));

    expect(withValueAt(value, below, 'x')).toBe(value);

    // The control for the axis, and the asymmetry the module argues
    // for: the same absent member as the LAST step is created, so
    // what the refusal reports is the descent and not the absence.
    expect(withValueAt(value, absent, 'x')).not.toBe(value);
  });

  it('refuses a descent through an inherited member', () => {
    // The shape prototype pollution produces: a member that resolves
    // through the PROTOTYPE rather than off the object itself. A
    // plain read would rebuild a container the value does not have.
    const inherited: unknown = Object.create({ terms: [{ w: 1 }] });
    const below = childPath(TERMS, indexSegment(0));

    expect(withValueAt(inherited, below, 'x')).toBe(inherited);

    // The control for the axis: the same member held as the
    // object's OWN is written through.
    const owned: unknown = { terms: [{ w: 1 }] };

    expect(withValueAt(owned, below, 'x')).not.toBe(owned);
  });

  it('answers the value it was handed, by identity', () => {
    // Identity and not an equal copy, which is what lets a caller
    // see a refusal at all. Every refusal above reads it; this is
    // the claim stated once against a value that is not a snapshot
    // of itself.
    const value = group();
    const dead = childPath(TERMS, indexSegment(9));
    const next = withValueAt(value, dead, 'x');

    expect(next).toBe(value);
    expect(snapshot(next)).toBe(snapshot(group()));
  });
});

describe('what a reorder refuses', () => {
  it('refuses a from outside the list', () => {
    const value = group();

    expect(withListReordered(value, TERMS, 2, 0)).toBe(value);
    expect(withListReordered(value, TERMS, -1, 0)).toBe(value);

    // The control for the axis: the last position it does hold.
    expect(withListReordered(value, TERMS, 1, 0)).not.toBe(value);
  });

  it('refuses a to outside the list', () => {
    const value = group();

    expect(withListReordered(value, TERMS, 0, 2)).toBe(value);
    expect(withListReordered(value, TERMS, 0, -1)).toBe(value);

    // The control for the axis: the same `from` with a `to` inside.
    expect(withListReordered(value, TERMS, 0, 1)).not.toBe(value);
  });

  it('refuses an index that is not a whole number', () => {
    // `1.5` passes both bounds of a two-item list and is still not a
    // position; `NaN` fails every comparison and so is caught by the
    // bounds alone. Only the first defends the integer test.
    const value = group();

    expect(withListReordered(value, TERMS, 1.5, 0)).toBe(value);
    expect(withListReordered(value, TERMS, 0, 1.5)).toBe(value);
    expect(withListReordered(value, TERMS, Number.NaN, 0))
      .toBe(value);
  });

  it('refuses a reorder at a path holding no list', () => {
    const value = group();
    const name = childPath(ROOT_PATH, keySegment('name'));

    expect(withListReordered(value, name, 0, 0)).toBe(value);
    expect(withListReordered(value, FIRST, 0, 0)).toBe(value);
    expect(withListReordered(value, ROOT_PATH, 0, 0)).toBe(value);

    // The control for the axis: a path that does hold one, moved to
    // where it already sits, which is accepted rather than refused.
    expect(withListReordered(value, TERMS, 0, 0)).not.toBe(value);
  });
});

describe('what a path reads', () => {
  it('reads null where a member holds null', () => {
    // A cleared box writes `null`, so `null` is a value here and
    // cannot double as the absent answer.
    expect(readValueAt(group(), FIRST_NOTES)).toBeNull();
  });

  it('reads undefined where no member sits', () => {
    const value = group();
    const absent = childPath(SECOND, keySegment('notes'));

    // The pair that separates the two states: one term declares
    // `notes` as `null` and the other has no such member, and a
    // module answering `null` for both loses the difference.
    expect(readValueAt(value, absent)).toBeUndefined();
    expect(readValueAt(value, FIRST_NOTES)).toBeNull();
  });

  it('reads through both container kinds', () => {
    const value = group();

    expect(readValueAt(value, ROOT_PATH)).toBe(value);
    expect(readValueAt(value, TERMS)).toHaveLength(2);
    expect(readValueAt(value, SECOND_PATTERN)).toBe('storm');
    expect(readValueAt(value, childPath(ALIASES, indexSegment(1))))
      .toBe('damp');
  });

  it('reads an absent position at every depth', () => {
    const value = group();
    const name = childPath(ROOT_PATH, keySegment('name'));
    const paths: readonly NodePath[] = [
      childPath(ROOT_PATH, keySegment('missing')),
      childPath(TERMS, indexSegment(9)),
      childPath(SECOND_PATTERN, keySegment('deeper')),
      childPath(name, indexSegment(0)),
    ];

    paths.forEach((path) => {
      expect(readValueAt(value, path)).toBeUndefined();
    });
  });

  it('reads an inherited member as absent', () => {
    const inherited: unknown = Object.create({ name: 'Weather' });
    const name = childPath(ROOT_PATH, keySegment('name'));

    expect(readValueAt(inherited, name)).toBeUndefined();

    // The control for the axis: the same member held as the
    // object's OWN is read.
    expect(readValueAt({ name: 'Weather' }, name)).toBe('Weather');
  });
});

describe('what a write answers', () => {
  it('leaves the value it was handed untouched', () => {
    // The only reading that catches an in-place write; every other
    // case in this file would pass against one.
    const value = group();
    const before = snapshot(value);

    withValueAt(value, SECOND_PATTERN, 'gale');
    withValueAt(value, FIRST_NOTES, 'severe');
    withValueAt(value, TERMS, []);
    withValueAt(value, childPath(ALIASES, indexSegment(0)), 'dry');

    expect(snapshot(value)).toBe(before);
  });

  it('replaces the position it was given', () => {
    const value = group();
    const next = withValueAt(value, SECOND_PATTERN, 'gale');

    expect(readValueAt(next, SECOND_PATTERN)).toBe('gale');
    expect(readValueAt(value, SECOND_PATTERN)).toBe('storm');
  });

  it('rebuilds every container along the path', () => {
    // What "immutable" means here: no container the write passed
    // through is the one the caller handed over, so nothing it kept
    // a reference to can have moved.
    const value = group();
    const next = withValueAt(value, SECOND_PATTERN, 'gale');
    const spine: readonly NodePath[] = [ROOT_PATH, TERMS, SECOND];

    spine.forEach((path) => {
      expect(requireAt(next, path))
        .not.toBe(requireAt(value, path));
    });
  });

  it('shares the containers off the path', () => {
    // The documented limit of the sharing, pinned rather than left
    // to be assumed: an untouched sibling is the SAME object, which
    // is what lets React leave an unrelated subtree alone. It is
    // only safe because every write comes through this module.
    const value = group();
    const next = withValueAt(value, SECOND_PATTERN, 'gale');

    expect(requireAt(next, ALIASES)).toBe(requireAt(value, ALIASES));
    expect(requireAt(next, FIRST)).toBe(requireAt(value, FIRST));
  });

  it('creates a member the value did not have', () => {
    // The last-segment rule: an object is a named set, so a form
    // may fill a nullable member that arrived absent.
    const value = group();
    const notes = childPath(SECOND, keySegment('notes'));
    const next = withValueAt(value, notes, 'severe');

    expect(readValueAt(next, notes)).toBe('severe');
    expect(readValueAt(value, notes)).toBeUndefined();
  });

  it('writes null where a box was cleared', () => {
    // The plan's decision, read back through the module that has to
    // survive it: `null` lands as a value rather than as a delete.
    const value = group();
    const next = withValueAt(value, FIRST_NOTES, null);
    const term = requireAt(next, FIRST);

    expect(readValueAt(next, FIRST_NOTES)).toBeNull();
    expect(Object.hasOwn(term as object, 'notes')).toBe(true);
  });

  it('answers the replacement at the root', () => {
    // The base case, and the one accepted write that can answer
    // identity: handing the value back onto itself.
    const value = group();
    const replacement: unknown = { name: 'Traffic' };

    expect(withValueAt(value, ROOT_PATH, replacement))
      .toBe(replacement);
    expect(withValueAt(value, ROOT_PATH, value)).toBe(value);
  });
});

describe('what a reorder answers', () => {
  it('moves an item to the index it was given', () => {
    // The destination convention, stated as the property that
    // separates it from a drop gap: the item that was at `from` is
    // at `to`, whichever way it travelled.
    const value = group();
    const aliases: unknown = ['a', 'b', 'c', 'd'];
    const four = withValueAt(value, ALIASES, aliases);
    const moves: readonly (readonly [number, number])[] = [
      [0, 2],
      [3, 0],
      [1, 2],
      [2, 1],
    ];

    moves.forEach(([from, to]) => {
      const next = withListReordered(four, ALIASES, from, to);
      const moved = readValueAt(four, childPath(
        ALIASES,
        indexSegment(from),
      ));

      expect(readValueAt(next, childPath(ALIASES, indexSegment(to))))
        .toBe(moved);
      expect(readValueAt(next, ALIASES)).toHaveLength(4);
    });
  });

  it('keeps the order every other item was in', () => {
    const value = group();
    const four = withValueAt(value, ALIASES, ['a', 'b', 'c', 'd']);
    const next = withListReordered(four, ALIASES, 0, 2);

    // A gap convention would answer `['b', 'a', 'c', 'd']` here,
    // which is why the whole order is read rather than one position.
    const back = withListReordered(four, ALIASES, 3, 1);

    expect(readValueAt(next, ALIASES)).toEqual(['b', 'c', 'a', 'd']);
    expect(readValueAt(back, ALIASES)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('leaves the value it was handed untouched', () => {
    // The same reading the write cases take, against the operation
    // most likely to reach for a splice.
    const value = group();
    const before = snapshot(value);

    withListReordered(value, TERMS, 0, 1);
    withListReordered(value, TERMS, 1, 0);
    withListReordered(value, ALIASES, 0, 1);

    expect(snapshot(value)).toBe(before);
  });

  it('moves an item deep in the tree', () => {
    // A reorder of a list that is not the root: the spine above it
    // rebuilds through the same write path, so the two cannot drift.
    const value = group();
    const next = withListReordered(value, TERMS, 0, 1);

    expect(readValueAt(next, SECOND_PATTERN)).toBe('rain');
    expect(readValueAt(next, childPath(FIRST, keySegment('pattern'))))
      .toBe('storm');
    expect(requireAt(next, ROOT_PATH)).not.toBe(value);
    expect(requireAt(next, ALIASES)).toBe(requireAt(value, ALIASES));
  });

  it('carries each item over rather than copying it', () => {
    // The items are moved, not rebuilt: the object that was at
    // `from` is the SAME object at `to`, which is what keeps a
    // reorder from looking like an edit to every term at once.
    const value = group();
    const next = withListReordered(value, TERMS, 0, 1);

    expect(requireAt(next, SECOND)).toBe(requireAt(value, FIRST));
    expect(requireAt(next, FIRST)).toBe(requireAt(value, SECOND));
  });

  it('rebuilds rather than answering identity at from == to', () => {
    // A move to where the item already sits is accepted, so a
    // refusal stays the one reason this function answers identity.
    const value = group();
    const next = withListReordered(value, TERMS, 1, 1);

    expect(next).not.toBe(value);
    expect(readValueAt(next, ALIASES)).toEqual(['wet', 'damp']);
    expect(snapshot(next)).toBe(snapshot(value));
  });
});
