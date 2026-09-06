import type {
  ContainerFieldType,
  ListFieldDef,
  ObjectFieldDef,
} from './fieldDef';
import type { NodePath } from './nodePath';
import type { FormNode, TreeNavNode } from './tree';

import { describe, expect, it } from 'vitest';

import {
  childPath,
  indexSegment,
  keySegment,
  pathKey,
  ROOT_PATH,
} from './nodePath';
import {
  breadcrumbTo,
  buildFormTree,
  nodeAt,
  treeNavNodes,
} from './tree';

/**
 * The two container types, as a typed literal.
 *
 * The REMOVAL direction, which nothing in a fixture guards: annotated
 * `readonly ContainerFieldType[]`, so a type taken out of the union
 * reddens `check-types` at the spelling here that outlived it
 * (measured: TS2322 on this literal for `'object'`).
 *
 * Its complement is NOT `./tree.ts`'s switch, which is the reading
 * this pairing invites and which the header measures as false: that
 * switch is total over `ContainerFieldDef`'s two INTERFACES, so a
 * member added to the ROSTER leaves it green. Nothing in this
 * package guards the roster's addition direction, and the def
 * union's is the module's own default branch.
 */
const CONTAINER_TYPES: readonly ContainerFieldType[] = [
  'list',
  'object',
];

/**
 * The object one term is, all four members leaves.
 *
 * Modelled on the Lexicon payload the swap actually hands over, so
 * the nesting these cases walk is the nesting v1 ships rather than a
 * shape invented to be deep.
 */
const TERM: ObjectFieldDef = {
  key: 'term',
  label: 'Term',
  type: 'object',
  fields: [
    { key: 'pattern', label: 'Pattern', type: 'string' },
    { key: 'weight', label: 'Weight', type: 'number' },
  ],
};

/** A named set of terms: one leaf member and one nested list. */
const GROUP: ObjectFieldDef = {
  key: 'group',
  label: 'Group',
  type: 'object',
  fields: [
    { key: 'name', label: 'Name', type: 'string' },
    { key: 'terms', label: 'Terms', type: 'list', item: TERM },
  ],
};

/**
 * A list of objects three levels deep, which is the fixture below.
 *
 * `Groups` holds objects, each of which holds a list holding objects
 * — so the deepest node sits at a path of THREE segments and its
 * breadcrumb has four items. The list's own label and its item def's
 * label differ on purpose: an item numbered `Groups 1` would be this
 * module reading the wrong one of the two.
 */
const GROUPS: ListFieldDef = {
  key: 'groups',
  label: 'Groups',
  type: 'list',
  item: GROUP,
};

/** A list whose item def is a LEAF, which makes its items fields. */
const ALIASES: ListFieldDef = {
  key: 'aliases',
  label: 'Aliases',
  type: 'list',
  item: { key: 'alias', label: 'Alias', type: 'string' },
};

/**
 * The value the tree is built over.
 *
 * The second group's `terms` is EMPTY deliberately: that is the
 * container-node-with-no-children case, and it is the one shape a
 * def alone can never predict.
 */
const VALUE: unknown = [
  {
    name: 'Weather',
    terms: [
      { pattern: 'rain', weight: 2 },
      { pattern: 'storm', weight: 5 },
    ],
  },
  { name: 'Traffic', terms: [] },
];

/** The first group. */
const GROUP_ONE: NodePath = childPath(ROOT_PATH, indexSegment(0));

/** The second group, whose list of terms is empty. */
const GROUP_TWO: NodePath = childPath(ROOT_PATH, indexSegment(1));

/** The first group's list of terms. */
const TERMS_ONE: NodePath = childPath(GROUP_ONE, keySegment('terms'));

/** The second group's list of terms, which holds none. */
const TERMS_TWO: NodePath = childPath(GROUP_TWO, keySegment('terms'));

/**
 * The node a path names, with the `null` raised rather than absorbed.
 *
 * A `?.` at each call site would let a case about a node's children
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

describe('what the tree refuses to name a node', () => {
  it('answers no node for a path naming none', () => {
    const tree = buildFormTree(GROUPS, VALUE);
    // An item the value does not hold: the list has two groups, so
    // this is what a selection becomes after a delete or a reorder.
    const missing = childPath(ROOT_PATH, indexSegment(7));

    expect(nodeAt(tree, missing)).toBeNull();
    expect(breadcrumbTo(tree, missing)).toEqual([]);

    // The control for the axis: the same descent at an item that
    // exists, so the two above are the index and not every answer.
    expect(nodeAt(tree, GROUP_ONE)).not.toBeNull();
    expect(breadcrumbTo(tree, GROUP_ONE)).toHaveLength(2);
  });

  it('makes no node of a leaf member, however deep', () => {
    const tree = buildFormTree(GROUPS, VALUE);
    const name = childPath(GROUP_ONE, keySegment('name'));
    const pattern = childPath(
      childPath(TERMS_ONE, indexSegment(0)),
      keySegment('pattern'),
    );

    expect(nodeAt(tree, name)).toBeNull();
    expect(nodeAt(tree, pattern)).toBeNull();

    // The control for the axis: the CONTAINER member sitting beside
    // `name` in the same def does become a node, so what the two
    // above report is the leaf and not the depth.
    expect(nodeAt(tree, TERMS_ONE)).not.toBeNull();
  });

  it('keeps a path branching away from the root unresolved', () => {
    const tree = buildFormTree(GROUPS, VALUE);
    const subtree = requireNode(tree, GROUP_ONE);
    // A path into the OTHER group, handed to the first group's
    // subtree. Its final segment names a child that exists there, so
    // only the prefix separates the two.
    const elsewhere = TERMS_TWO;

    expect(nodeAt(subtree, elsewhere)).toBeNull();

    // The control for the axis: the subtree does resolve a path
    // through its OWN root.
    expect(nodeAt(subtree, TERMS_ONE)).not.toBeNull();
  });

  it('reads a value disagreeing with its defs as empty', () => {
    // Not a refusal: fixtures drift and a payload arrives from
    // anywhere, so a list position holding a string answers no items
    // rather than throwing where an operator would see it.
    const tree = buildFormTree(GROUPS, 'not a list at all');

    expect(tree.children).toEqual([]);
    expect(nodeAt(tree, ROOT_PATH)).toBe(tree);
  });

  it('reads an inherited member as absent', () => {
    // The shape prototype pollution produces: a payload whose member
    // resolves through the PROTOTYPE rather than off the object
    // itself. A plain read would build item nodes for data the value
    // does not have, which is why the walk asks whose member it is.
    const inherited: unknown = Object.create({
      terms: [{ pattern: 'rain', weight: 2 }],
    });
    const terms = childPath(ROOT_PATH, keySegment('terms'));

    expect(requireNode(buildFormTree(GROUP, inherited), terms).children)
      .toEqual([]);

    // The control for the axis: the same member, held as the
    // object's OWN, does build the item node.
    const owned = buildFormTree(GROUP, {
      terms: [{ pattern: 'rain', weight: 2 }],
    });

    expect(requireNode(owned, terms).children).toHaveLength(1);
  });
});

describe('what a container node carries', () => {
  it('answers a node with no children for an empty list', () => {
    const tree = buildFormTree(GROUPS, VALUE);
    const empty = requireNode(tree, TERMS_TWO);

    expect(empty.children).toEqual([]);
    expect(empty.label).toBe('Terms');
    expect(empty.def.type).toBe('list');

    // The control for the axis: the SAME def one group over, whose
    // value holds two items. So the empty answer is the value and
    // not a list def that never makes children.
    expect(requireNode(tree, TERMS_ONE).children).toHaveLength(2);
  });

  it('answers no children for a list of leaves that has items', () => {
    // The header's list-of-strings case: the items are leaf members,
    // so they are boxes in this node's own form rather than nodes.
    const tree = buildFormTree(ALIASES, ['first', 'second']);

    expect(tree.children).toEqual([]);
    expect(tree.def.type).toBe('list');
  });

  it('drops leaf members and keeps container ones', () => {
    const tree = buildFormTree(GROUPS, VALUE);
    const group = requireNode(tree, GROUP_ONE);
    const labels = group.children.map((child) => child.label);

    // `name` is a leaf and `terms` is a list; both are declared on
    // the same def, so this is the partition and not an ordering.
    // Read off `GROUP` rather than off `group.def`, which the node
    // narrows no further than a container: `fields` on it is TS2339
    // naming `ListFieldDef`, which is the union working.
    expect(labels).toEqual(['Terms']);
    expect(group.def).toBe(GROUP);
    expect(GROUP.fields).toHaveLength(2);
  });

  it('walks a list of objects three deep', () => {
    const tree = buildFormTree(GROUPS, VALUE);
    const term = childPath(TERMS_ONE, indexSegment(1));
    const node = requireNode(tree, term);

    expect(node.path).toHaveLength(3);
    expect(node.label).toBe('Term 2');
    expect(node.def).toBe(TERM);
    expect(node.children).toEqual([]);

    // Every node on the way exists as well, which is what says the
    // depth was walked rather than reached by a lucky suffix match.
    expect(requireNode(tree, GROUP_ONE).label).toBe('Group 1');
    expect(requireNode(tree, TERMS_ONE).label).toBe('Terms');
  });

  it('roots the tree at the root path, whatever the def', () => {
    const tree = buildFormTree(GROUPS, VALUE);

    expect(tree.path).toEqual(ROOT_PATH);
    expect(tree.label).toBe('Groups');
    expect(nodeAt(tree, ROOT_PATH)).toBe(tree);
  });

  it('builds a node for both container types', () => {
    const tree = buildFormTree(GROUPS, VALUE);
    const built = [tree, requireNode(tree, GROUP_ONE)]
      .map((node) => node.def.type);

    expect([...built].sort()).toEqual([...CONTAINER_TYPES].sort());
  });

  it('leaves the value it was built over untouched', () => {
    // The only reading that catches a walk writing into the data it
    // was handed; every other case here would pass against one.
    const value = [{ name: 'Weather', terms: [{ pattern: 'rain' }] }];
    const before = JSON.stringify(value);

    buildFormTree(GROUPS, value);

    expect(JSON.stringify(value)).toBe(before);
  });
});

describe('how a list item is labelled', () => {
  it('numbers items from one, off the ITEM def label', () => {
    const tree = buildFormTree(GROUPS, VALUE);
    const labels = tree.children.map((child) => child.label);

    // `Group`, the item def's label — never `Groups`, the list's.
    // And numbered from one, where the path index is zero-based.
    expect(labels).toEqual(['Group 1', 'Group 2']);
    expect(tree.children[0]?.path).toEqual([indexSegment(0)]);
  });

  it('lets two lists share a label without sharing a key', () => {
    // A label is not unique across a tree and is not meant to be:
    // both groups' first term reads `Term 1`. The key is what tells
    // them apart, which is why every projection spells it off the
    // path rather than off the label.
    const value = [
      { name: 'Weather', terms: [{ pattern: 'rain' }] },
      { name: 'Traffic', terms: [{ pattern: 'jam' }] },
    ];
    const tree = buildFormTree(GROUPS, value);
    const first = childPath(TERMS_ONE, indexSegment(0));
    const second = childPath(TERMS_TWO, indexSegment(0));

    expect(requireNode(tree, first).label).toBe('Term 1');
    expect(requireNode(tree, second).label).toBe('Term 1');
    expect(new Set(navKeys(treeNavNodes(tree))).size).toBe(7);
  });
});

describe('what the breadcrumb walks back along', () => {
  it('answers one item per node, root first and inclusive', () => {
    const tree = buildFormTree(GROUPS, VALUE);
    const term = childPath(TERMS_ONE, indexSegment(0));
    const trail = breadcrumbTo(tree, term);

    expect(trail.map((item) => item.label))
      .toEqual(['Groups', 'Group 1', 'Terms', 'Term 1']);
  });

  it('keys every item the way the tree projection does', () => {
    // What makes the two columns one navigation: the breadcrumb item
    // a click reports and the tree key a selection reports are the
    // same string for the same node.
    const tree = buildFormTree(GROUPS, VALUE);
    const trail = breadcrumbTo(tree, TERMS_ONE);
    const keys = trail.map((item) => item.key);
    const wanted = [ROOT_PATH, GROUP_ONE, TERMS_ONE].map(pathKey);

    expect(keys).toEqual(wanted);
    expect(navKeys(treeNavNodes(tree))).toEqual(
      expect.arrayContaining(keys),
    );
  });

  it('answers one item at the root', () => {
    const tree = buildFormTree(GROUPS, VALUE);

    expect(breadcrumbTo(tree, ROOT_PATH)).toEqual([
      { key: pathKey(ROOT_PATH), label: 'Groups' },
    ]);
  });

  it('is empty exactly when the path names no node', () => {
    // The pair the module's one-walk decision buys: two readings of
    // one trail cannot disagree about whether a path resolves.
    const tree = buildFormTree(GROUPS, VALUE);
    const paths: readonly NodePath[] = [
      ROOT_PATH,
      GROUP_ONE,
      TERMS_TWO,
      childPath(ROOT_PATH, indexSegment(7)),
      childPath(GROUP_ONE, keySegment('name')),
      childPath(TERMS_TWO, indexSegment(0)),
    ];
    const readings = paths.map((path) => [
      nodeAt(tree, path) === null,
      breadcrumbTo(tree, path).length === 0,
    ]);

    readings.forEach(([absent, empty]) => {
      expect(absent).toBe(empty);
    });

    // A run where every path resolved would satisfy that loop, so
    // both answers have to appear among them.
    expect(readings.map(([absent]) => absent).sort())
      .toEqual([false, false, false, true, true, true]);
  });
});

describe('what the tree component is handed', () => {
  it('projects the root as the only member of a forest', () => {
    const tree = buildFormTree(GROUPS, VALUE);
    const nodes = treeNavNodes(tree);

    // The root is selectable — it is where the list's own form, and
    // so the reorder, lives — so it is drawn rather than skipped.
    expect(nodes).toHaveLength(1);
    expect(nodes[0]?.key).toBe(pathKey(ROOT_PATH));
    expect(nodes[0]?.label).toBe('Groups');
  });

  it('gives every node in the tree a distinct key', () => {
    const tree = buildFormTree(GROUPS, VALUE);
    const keys = navKeys(treeNavNodes(tree));

    // Root, two groups, two term lists, two terms.
    expect(keys).toHaveLength(7);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('projects the same nesting the tree holds', () => {
    const tree = buildFormTree(GROUPS, VALUE);
    const nodes = treeNavNodes(tree);
    const groupTwo = nodes[0]?.children[1];

    expect(groupTwo?.label).toBe('Group 2');
    expect(groupTwo?.children).toHaveLength(1);
    expect(groupTwo?.children[0]?.children).toEqual([]);
  });

  it('resolves a projected key back through the tree', () => {
    // The round trip the shell depends on: a component reports a
    // selection as a key, and the app turns it back into a path.
    const tree = buildFormTree(GROUPS, VALUE);
    const term = childPath(TERMS_ONE, indexSegment(1));

    expect(navKeys(treeNavNodes(tree))).toContain(pathKey(term));
    expect(requireNode(tree, term).label).toBe('Term 2');
  });
});
