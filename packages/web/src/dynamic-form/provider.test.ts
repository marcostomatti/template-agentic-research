import type {
  FieldDef,
  FieldType,
  ListFieldDef,
  ObjectFieldDef,
} from './fieldDef';
import type { NodePath } from './nodePath';
import type { FieldControlKind } from './registry';
import type { FormNode, TreeNavNode } from './tree';

import { describe, expect, it } from 'vitest';

import { isContainerField } from './fieldDef';
import {
  childPath,
  indexSegment,
  keySegment,
  parentPath,
  pathKey,
  ROOT_PATH,
  samePath,
} from './nodePath';
import { readNumberField, readStringField } from './readers';
import { controlKindFor } from './registry';
import {
  breadcrumbTo,
  buildFormTree,
  nodeAt,
  treeNavNodes,
} from './tree';
import {
  readValueAt,
  withListReordered,
  withValueAt,
} from './values';

/**
 * The six types v1 renders, as a typed literal.
 *
 * The roster the fixture below is held against, so "a def list
 * holding all six types" is a measurement rather than a count of the
 * defs somebody happened to write. Annotated `readonly FieldType[]`,
 * which is the REMOVAL direction: a type taken out of the union
 * reddens `check-types` at the spelling here that outlived it.
 *
 * Spelled out rather than assembled from `LEAF_FIELD_TYPES` and a
 * container roster — a roster checked against its own complement
 * agrees with itself whatever either of them says, and the coverage
 * case below is exactly the comparison that would go vacuous.
 */
const FIELD_TYPES: readonly FieldType[] = [
  'string',
  'boolean',
  'number',
  'datetime',
  'list',
  'object',
];

/**
 * One term: an object whose four members are the four leaf types.
 *
 * Modelled on the Lexicon payload the swap hands over, and widened
 * by the two members that payload has no use for — `enabled` and
 * `reviewedAt` — so ONE fixture carries every type the registry
 * maps and every reader the form calls.
 */
const TERM: ObjectFieldDef = {
  key: 'term',
  label: 'Term',
  type: 'object',
  fields: [
    { key: 'pattern', label: 'Pattern', type: 'string' },
    { key: 'weight', label: 'Weight', type: 'number' },
    { key: 'enabled', label: 'Enabled', type: 'boolean' },
    { key: 'reviewedAt', label: 'Reviewed', type: 'datetime' },
  ],
};

/**
 * The whole structure: a list of terms, rooted at the list itself.
 *
 * The shape v1 actually ships — `termPayloadSchema` reads an ARRAY
 * of entries — so a term is reached by ONE index segment and the
 * reorder these cases drive happens at the root. Its label differs
 * from its item def's on purpose: an item numbered `Terms 1` would
 * be the tree reading the wrong one of the two.
 */
const TERMS: ListFieldDef = {
  key: 'terms',
  label: 'Terms',
  type: 'list',
  item: TERM,
};

/** The first term, which every drill-in case below selects. */
const FIRST: NodePath = childPath(ROOT_PATH, indexSegment(0));

/** The second term. */
const SECOND: NodePath = childPath(ROOT_PATH, indexSegment(1));

/** The third term, and where a move to the end lands. */
const THIRD: NodePath = childPath(ROOT_PATH, indexSegment(2));

/** The first term's weight: the leaf box the write cases edit. */
const FIRST_WEIGHT: NodePath = childPath(
  FIRST,
  keySegment('weight'),
);

/**
 * The value every case below is handed.
 *
 * A function rather than a constant: every case here writes, and the
 * untouched readings are worth nothing if two cases share one
 * object. THREE terms rather than two, so a move has an item it does
 * not reach as well as the two it does.
 *
 * `reviewedAt` holds `null` on the middle term, which is what a
 * cleared box writes and the one value an absent read must not be
 * confused with.
 *
 * @returns A fresh structure, equal to every other call's.
 */
function terms(): unknown {
  return [
    {
      pattern: 'rain',
      weight: 2,
      enabled: true,
      reviewedAt: '2026-01-01T00:00:00Z',
    },
    {
      pattern: 'storm',
      weight: 5,
      enabled: false,
      reviewedAt: null,
    },
    {
      pattern: 'hail',
      weight: 1,
      enabled: true,
      reviewedAt: '2026-03-04T05:06:07Z',
    },
  ];
}

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
 * Every def the fixture holds, the root included, parents first.
 *
 * Switched on the DESTRUCTURED discriminant, as every walk in this
 * directory is, so a leaf type added to the union falls to the
 * default branch and is COLLECTED rather than silently skipped —
 * which is what keeps the coverage case below able to report it.
 *
 * @param def - The def to walk from.
 * @returns One entry per def reachable from it.
 */
function everyDef(def: FieldDef): readonly FieldDef[] {
  const { type } = def;

  switch (type) {
    case 'list':
      return [def, ...everyDef(def.item)];
    case 'object':
      return [def, ...def.fields.flatMap(everyDef)];
    default:
      return [def];
  }
}

/**
 * The control kind one def draws as.
 *
 * @param def - The def to draw.
 * @returns Its kind, as the registry names it.
 */
function kindOf(def: FieldDef): FieldControlKind {
  return controlKindFor(def.type);
}

/**
 * Every key in a projected forest, depth first.
 *
 * @param nodes - The forest to walk.
 * @returns Each node's key, parents before children.
 */
function navKeys(nodes: readonly TreeNavNode[]): string[] {
  return nodes.flatMap((node) => [
    node.key,
    ...navKeys(node.children),
  ]);
}

/**
 * The node a path names, with the `null` raised rather than absorbed.
 *
 * A `?.` at each call site would let a case about a drilled-in node
 * pass against no node at all, which is exactly what these cases are
 * checking — so an absent node is a failure here instead.
 *
 * @param tree - The tree to resolve against.
 * @param path - The path to resolve.
 * @returns The node it names.
 * @throws If the path names no node.
 */
function requireNode(tree: FormNode, path: NodePath): FormNode {
  const node = nodeAt(tree, path);

  if (node === null) {
    throw new Error(`No node at ${pathKey(path)}`);
  }

  return node;
}

describe('the def list the two columns render', () => {
  it('holds every one of the six field types', () => {
    const defs = everyDef(TERMS);
    const found = [...new Set(defs.map((def) => def.type))].sort();

    expect(found).toEqual([...FIELD_TYPES].sort());

    // One def per type, which is what says the set above came from
    // six distinct defs rather than from a fixture repeating one.
    expect(defs).toHaveLength(FIELD_TYPES.length);
  });

  it('draws each type as the kind the registry names', () => {
    const defs = everyDef(TERMS);
    const drilled = defs.filter(isContainerField).map(kindOf);
    const boxes = defs.filter((def) => !isContainerField(def));

    // Both containers are the one row that reports a PATH, and no
    // leaf shares that kind — which is what makes "drill in or
    // edit here" a reading of the def rather than a second table.
    expect(new Set(drilled)).toEqual(new Set(['drill-in']));
    expect(boxes.map(kindOf)).not.toContain('drill-in');

    // And the four leaves draw four DIFFERENT boxes, so the split
    // above is the container line and not one kind for everything.
    expect(new Set(boxes.map(kindOf)).size).toBe(boxes.length);
  });
});

describe('drilling into a term and back out', () => {
  it('makes a node of each term and of no leaf', () => {
    const tree = buildFormTree(TERMS, terms());

    expect(tree.children.map((node) => node.label))
      .toEqual(['Term 1', 'Term 2', 'Term 3']);

    // A leaf member is a BOX in the term's own form, so the path to
    // one names no node however deep it sits.
    expect(nodeAt(tree, FIRST_WEIGHT)).toBeNull();

    // The control for the axis: the term ABOVE that leaf is a node,
    // so what the null reports is the leaf and not the depth.
    expect(requireNode(tree, FIRST).def).toBe(TERM);
  });

  it('walks the breadcrumb back to the root by path', () => {
    const tree = buildFormTree(TERMS, terms());
    const trail = breadcrumbTo(tree, SECOND);
    const back = parentPath(SECOND);

    expect(trail.map((item) => item.label))
      .toEqual(['Terms', 'Term 2']);
    expect(trail.map((item) => item.key))
      .toEqual([ROOT_PATH, SECOND].map(pathKey));

    if (back === null) {
      throw new Error('The second term has no parent');
    }

    // What a breadcrumb click resolves to: the step back is a path
    // EQUAL to the root and never the same object, which is why the
    // shell compares by value rather than by identity.
    expect(samePath(back, ROOT_PATH)).toBe(true);
    expect(back).not.toBe(ROOT_PATH);
    expect(requireNode(tree, back)).toBe(tree);
  });

  it('keys the tree column and the breadcrumb alike', () => {
    const tree = buildFormTree(TERMS, terms());
    const keys = navKeys(treeNavNodes(tree));
    const trail = breadcrumbTo(tree, THIRD);
    const missing = childPath(ROOT_PATH, indexSegment(7));

    // The two columns are ONE navigation: the key the tree reports
    // a selection as and the key the breadcrumb reports a step as
    // are the same string for the same node, so neither is
    // translated on the way across.
    expect(keys).toHaveLength(4);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toEqual(
      expect.arrayContaining(trail.map((item) => item.key)),
    );

    // The control for the axis: a key for a position the value does
    // not hold is not in there, so the containment above is the
    // node and not every string.
    expect(keys).not.toContain(pathKey(missing));
  });
});

describe('what an edited box writes and reads back', () => {
  it('writes a read number where the path names', () => {
    const value = terms();
    const before = snapshot(value);
    const reading = readNumberField('42');

    if (!reading.ok) {
      throw new Error(reading.sentence);
    }

    const next = withValueAt(value, FIRST_WEIGHT, reading.value);

    expect(readValueAt(next, FIRST_WEIGHT)).toBe(42);

    // The value the caller kept is the value it still has, which is
    // what lets the provider apply an edit, hand the CANDIDATE to a
    // schema, and report only what came back.
    expect(readValueAt(value, FIRST_WEIGHT)).toBe(2);
    expect(snapshot(value)).toBe(before);
  });

  it('round-trips a cleared box as null, not absent', () => {
    const value = terms();
    const pattern = childPath(FIRST, keySegment('pattern'));
    const gone = childPath(FIRST, keySegment('gone'));
    const reading = readStringField('   ');

    if (!reading.ok) {
      throw new Error(reading.sentence);
    }

    const next = withValueAt(value, pattern, reading.value);

    // The plan's decision, end to end: an empty box writes `null`,
    // and `null` reads back as a VALUE. An absent read answers
    // `undefined`, which is the one thing it must not collapse to
    // — the form may draw a member holding null and may not draw
    // one that is not there at all.
    expect(reading.value).toBeNull();
    expect(readValueAt(next, pattern)).toBeNull();
    expect(readValueAt(next, gone)).toBeUndefined();
    expect(snapshot(value)).toBe(snapshot(terms()));
  });

  it('takes the accepted branch and not the refused', () => {
    const value = terms();
    const refusal = readNumberField('12,5');
    const reading = readNumberField('12.5');

    // A refusal carries no value to write, so the form has nothing
    // to hand `withValueAt` and the draft stays what it was. The
    // accepted neighbour is what says the box was reachable at all
    // — one character apart, and the only difference is the rule.
    expect(refusal.ok).toBe(false);

    if (!reading.ok) {
      throw new Error(reading.sentence);
    }

    const next = withValueAt(value, FIRST_WEIGHT, reading.value);

    expect(readValueAt(next, FIRST_WEIGHT)).toBe(12.5);
    expect(readValueAt(value, FIRST_WEIGHT)).toBe(2);
  });

  it('shares every term the write did not touch', () => {
    const value = terms();
    const next = withValueAt(value, FIRST_WEIGHT, 9);

    if (!Array.isArray(value) || !Array.isArray(next)) {
      throw new Error('The fixture is not a list');
    }

    // Structural sharing, which a deep copy would pass every
    // untouched reading above while destroying: React leaves a
    // subtree alone on referential equality, so a copy per
    // keystroke would re-render every term in the list.
    expect(next).not.toBe(value);
    expect(next[0]).not.toBe(value[0]);
    expect(next[1]).toBe(value[1]);
    expect(next[2]).toBe(value[2]);
  });
});

describe('what a reorder moves and what it leaves', () => {
  it('finds the moved term at its destination path', () => {
    const value = terms();
    const before = snapshot(value);
    const drilled = requireNode(buildFormTree(TERMS, value), FIRST);
    const next = withListReordered(value, ROOT_PATH, 0, 2);
    const moved = requireNode(buildFormTree(TERMS, next), THIRD);
    const trail = breadcrumbTo(buildFormTree(TERMS, next), THIRD);

    // An index segment is POSITIONAL, so a move does not carry a
    // selection with it: the path naming the drilled-in term after
    // the move is the DESTINATION's, which is what the mounted form
    // re-selects by rather than assuming its own path held.
    expect(moved.def).toBe(drilled.def);
    expect(readValueAt(next, THIRD)).toBe(readValueAt(value, FIRST));

    // The item MOVED rather than being rebuilt, and the label that
    // names it followed its position rather than the item.
    expect(drilled.label).toBe('Term 1');
    expect(moved.label).toBe('Term 3');
    expect(trail.map((item) => item.label))
      .toEqual(['Terms', 'Term 3']);
    expect(snapshot(value)).toBe(before);
  });

  it('leaves the old path naming the term moved in', () => {
    const value = terms();
    const next = withListReordered(value, ROOT_PATH, 0, 2);

    // The complementary half, and the one a selection held across a
    // move gets wrong: the path is unchanged and what sits at it is
    // not. `./nodePath.ts` records that instability; this is it at
    // provider scope.
    expect(readValueAt(next, FIRST))
      .not.toBe(readValueAt(value, FIRST));
    expect(readValueAt(next, FIRST))
      .toBe(readValueAt(value, SECOND));

    // The node is still THERE, which is what makes a stale
    // selection quiet rather than an empty second column.
    expect(nodeAt(buildFormTree(TERMS, next), FIRST)).not.toBeNull();
  });

  it('leaves a term the move did not reach alone', () => {
    const value = terms();
    const next = withListReordered(value, ROOT_PATH, 0, 1);

    // `to` is where the item LANDS, never a gap to drop into: the
    // first two terms swap and the third is the same object it was.
    expect(readValueAt(next, FIRST)).toBe(readValueAt(value, SECOND));
    expect(readValueAt(next, SECOND)).toBe(readValueAt(value, FIRST));
    expect(readValueAt(next, THIRD)).toBe(readValueAt(value, THIRD));
    expect(snapshot(value)).toBe(snapshot(terms()));
  });

  it('leaves the tree standing after a refused move', () => {
    const value = terms();
    const refused = withListReordered(value, ROOT_PATH, 0, 7);
    const held = buildFormTree(TERMS, value);
    const keys = navKeys(treeNavNodes(buildFormTree(TERMS, refused)));
    const standing = navKeys(treeNavNodes(held));

    // A refused move answers the value itself, so a selection the
    // shell is holding stays valid rather than becoming a path that
    // names nothing.
    expect(refused).toBe(value);
    expect(keys).toEqual(standing);

    // The control for the axis: a move the list DOES hold rebuilds.
    expect(withListReordered(value, ROOT_PATH, 0, 2)).not.toBe(value);
  });
});

describe('the whole journey over one value', () => {
  it('leaves the value handed in untouched throughout', () => {
    const value = terms();
    const before = snapshot(value);
    const movedWeight = childPath(THIRD, keySegment('weight'));
    const movedStamp = childPath(THIRD, keySegment('reviewedAt'));
    const typed = readNumberField('87');

    if (!typed.ok) {
      throw new Error(typed.sentence);
    }

    const edited = withValueAt(value, FIRST_WEIGHT, typed.value);
    const moved = withListReordered(edited, ROOT_PATH, 0, 2);
    const cleared = withValueAt(moved, movedStamp, null);
    const tree = buildFormTree(TERMS, cleared);

    // The edit and the move compose: the term edited at index 0 is
    // the term standing at index 2, carrying what was typed into it
    // and the stamp cleared after the move.
    expect(readValueAt(cleared, movedWeight)).toBe(87);
    expect(readValueAt(cleared, movedStamp)).toBeNull();
    expect(requireNode(tree, THIRD).label).toBe('Term 3');

    // And the value the caller kept reads exactly as it did, after
    // a drill-in, a leaf write, a reorder and a second write.
    expect(snapshot(value)).toBe(before);
    expect(readValueAt(value, FIRST_WEIGHT)).toBe(2);
    expect(buildFormTree(TERMS, value).children).toHaveLength(3);
  });
});
