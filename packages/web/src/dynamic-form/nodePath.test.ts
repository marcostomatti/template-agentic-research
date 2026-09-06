import type { NodePath, PathSegment, SegmentKind } from './nodePath';

import { describe, expect, it } from 'vitest';

import {
  childPath,
  indexSegment,
  keySegment,
  parentPath,
  pathKey,
  ROOT_PATH,
  samePath,
} from './nodePath';

/**
 * One segment per kind, at ONE shared payload.
 *
 * Keyed by {@link SegmentKind} rather than listed, so a third kind
 * added to the union is a key the COMPILER demands here — the
 * addition direction, which the module's own switch reports at its
 * default branch and which nothing in a listed fixture would.
 *
 * The payload is deliberately the same digit on both sides. That is
 * what makes the distinctness case below a reading about KIND: two
 * segments spelling different things would answer distinct keys
 * under a spelling that dropped the kind entirely.
 */
const SEGMENTS: Readonly<Record<SegmentKind, PathSegment>> = {
  key: keySegment('0'),
  index: indexSegment(0),
};

/**
 * The two kinds, as a typed literal.
 *
 * The direction {@link SEGMENTS} cannot guard: annotated
 * `readonly SegmentKind[]`, so a kind REMOVED from the union reddens
 * `check-types` at the spelling here that outlived it. Neither
 * artifact reports the other's direction.
 */
const SEGMENT_KINDS: readonly SegmentKind[] = ['key', 'index'];

/** The list the Lexicon swap drills into, one step below the root. */
const TERMS: NodePath = childPath(ROOT_PATH, keySegment('terms'));

/**
 * The parent of a path, with the root's `null` raised rather than
 * turned into a path.
 *
 * A `?? ROOT_PATH` at each call site would make every walk answer
 * the root eventually, which is exactly the reading these cases are
 * checking — so the absent parent is a failure here instead.
 *
 * @param path - The path to climb from.
 * @returns Its parent.
 * @throws If the path is the root, which has none.
 */
function parentOf(path: NodePath): NodePath {
  const parent = parentPath(path);

  if (parent === null) {
    throw new Error(`No parent for ${pathKey(path)}`);
  }

  return parent;
}

describe('what the path vocabulary refuses', () => {
  it('answers no parent at the root', () => {
    expect(parentPath(ROOT_PATH)).toBeNull();

    // The control for the axis: a path that HAS a parent, so the
    // `null` above is the root's answer and not every answer.
    expect(parentPath(TERMS)).not.toBeNull();
  });

  it('tells a list item from a member of an object', () => {
    const item = childPath(TERMS, indexSegment(0));
    const member = childPath(TERMS, keySegment('pattern'));

    expect(samePath(item, member)).toBe(false);
    expect(pathKey(item)).not.toBe(pathKey(member));

    // The control for the axis: the same descent taken twice is ONE
    // position, so what the two above report is the segment rather
    // than the fresh array `childPath` answers every time.
    const rebuilt = childPath(TERMS, indexSegment(0));

    expect(samePath(item, rebuilt)).toBe(true);
  });

  it('keeps two paths differing only in kind unequal', () => {
    // `terms[0]` — the first item of the list — against
    // `terms['0']` — a member of an object whose key is a digit.
    // Both render as the same three characters, so a spelling
    // carrying no kind would answer equal, and React would put one
    // component with one operator's half-typed box over both.
    const item = childPath(TERMS, indexSegment(0));
    const digitKey = childPath(TERMS, keySegment('0'));

    expect(samePath(item, digitKey)).toBe(false);
    expect(pathKey(item)).not.toBe(pathKey(digitKey));

    // The control for the axis: the tag separates the two KINDS and
    // does not make every spelling unique — the same keyed member
    // built twice is still one position.
    const sameMember = childPath(TERMS, keySegment('0'));

    expect(samePath(digitKey, sameMember)).toBe(true);
  });

  it('throws for a kind outside the two, rather than keying it', () => {
    // The union is a compile-time one, so this segment cannot be
    // WRITTEN — only parsed, or rebuilt by something that does not
    // type-check. Spelling it anyway would key two different nodes
    // the same way and report nothing at all.
    const foreign = { kind: 'wildcard' } as unknown as PathSegment;
    const path = childPath(TERMS, foreign);

    expect(() => pathKey(path)).toThrow('wildcard');
    expect(() => samePath(path, TERMS)).toThrow('wildcard');

    // The control for the axis: the same descent at a kind that
    // exists.
    expect(() => pathKey(TERMS)).not.toThrow();
  });
});

describe('how a path grows and shrinks', () => {
  it('leaves the path it descended from untouched', () => {
    // The only reading that catches an in-place `push`: every other
    // case here would pass against one.
    const child = childPath(TERMS, indexSegment(2));

    expect(TERMS).toHaveLength(1);
    expect(child).toHaveLength(2);
    expect(ROOT_PATH).toHaveLength(0);
  });

  it('leaves the path it climbed from untouched', () => {
    const child = childPath(TERMS, indexSegment(2));
    const parent = parentOf(child);

    expect(child).toHaveLength(2);
    expect(parent).toHaveLength(1);
  });

  it('freezes the root, which every walk shares', () => {
    expect(Object.isFrozen(ROOT_PATH)).toBe(true);
  });

  it('climbs back to exactly the path it descended from', () => {
    const item = childPath(TERMS, indexSegment(1));
    const member = childPath(item, keySegment('pattern'));

    expect(samePath(parentOf(member), item)).toBe(true);
    expect(samePath(parentOf(item), TERMS)).toBe(true);
  });

  it('answers a root EQUAL to but distinct from the root', () => {
    // Why `samePath` exists rather than `===`: a climb rebuilds the
    // position, so identity answers `false` for two readings of the
    // one node.
    const climbed = parentOf(TERMS);

    expect(samePath(climbed, ROOT_PATH)).toBe(true);
    expect(climbed).not.toBe(ROOT_PATH);
  });

  it('walks a list of objects, which is the nesting v1 has', () => {
    const item = childPath(TERMS, indexSegment(3));
    const member = childPath(item, keySegment('weight'));

    expect(member).toHaveLength(3);
    expect(samePath(parentOf(parentOf(member)), TERMS)).toBe(true);
  });
});

describe('what a path key spells', () => {
  it('spells the root as a key that is present', () => {
    // Present as well as distinct: an empty string is a legal React
    // key and a falsy one, which is the shape a caller guards on.
    expect(pathKey(ROOT_PATH).length).toBeGreaterThan(0);
  });

  it('spells one position the same way every time', () => {
    const built = childPath(TERMS, indexSegment(0));
    const rebuilt = childPath(TERMS, indexSegment(0));

    expect(pathKey(built)).toBe(pathKey(rebuilt));
  });

  it('keeps a key spelling another step from colliding', () => {
    // The adversarial input for any joined spelling: a field key
    // carrying the module's OWN spelling of a step. A def list here
    // would not declare one, and a key is free to be any string, so
    // this is what the escape is for rather than a hypothetical.
    //
    // Derived rather than written out, so nothing here hardcodes the
    // separator or the tag: `oneStep` is however this module spells
    // one keyed descent, read back off a path it just spelled. A
    // literal would keep passing if the spelling changed, and would
    // stop measuring the escape without saying so.
    const oneStep = pathKey(childPath(ROOT_PATH, keySegment('b')))
      .slice(pathKey(ROOT_PATH).length);
    const smuggled = childPath(ROOT_PATH, keySegment(`a${oneStep}`));
    const nested = childPath(
      childPath(ROOT_PATH, keySegment('a')),
      keySegment('b'),
    );

    expect(samePath(smuggled, nested)).toBe(false);
    expect(pathKey(smuggled)).not.toBe(pathKey(nested));

    // The control for the axis: the two really are different
    // positions, so an equal answer above would be the spelling
    // losing a distinction rather than the paths agreeing.
    expect(smuggled).toHaveLength(1);
    expect(nested).toHaveLength(2);
  });

  it('gives every position in a walk a distinct key', () => {
    const item = childPath(TERMS, indexSegment(0));
    const walk: readonly NodePath[] = [
      ROOT_PATH,
      TERMS,
      item,
      childPath(TERMS, indexSegment(1)),
      childPath(item, keySegment('pattern')),
    ];
    const keys = walk.map(pathKey);

    expect(new Set(keys).size).toBe(walk.length);
  });
});

describe('what the two segment kinds are', () => {
  it('holds one segment per kind, leaving none untested', () => {
    const held = Object.keys(SEGMENTS).sort();

    expect(held).toEqual([...SEGMENT_KINDS].sort());
  });

  it('spells every kind apart at one shared payload', () => {
    const keys = SEGMENT_KINDS
      .map((kind) => pathKey(childPath(ROOT_PATH, SEGMENTS[kind])));

    expect(new Set(keys).size).toBe(SEGMENT_KINDS.length);
  });

  it('answers each kind on the segment its builder made', () => {
    // The builders are the only place the discriminant is spelled,
    // so this is what says a typo there would be caught rather than
    // accepted as a segment no branch claims.
    SEGMENT_KINDS.forEach((kind) => {
      expect(SEGMENTS[kind].kind).toBe(kind);
    });

    expect(SEGMENT_KINDS.length).toBeGreaterThan(0);
  });
});
