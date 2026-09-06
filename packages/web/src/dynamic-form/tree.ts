/**
 * @packageDocumentation
 * The node tree the two-column shell navigates: every position an
 * operator can STAND at, what it is called, and what sits under it.
 *
 * `./fieldDef.ts` says what a field IS and `./nodePath.ts` says where
 * one sits. This is the first module needing both at once, and the
 * only one that also needs a VALUE. The tree is what the left column
 * draws, what {@link breadcrumbTo} walks back along, and what
 * `./DynamicForm.tsx` resolves a selected path against before it
 * mounts one form.
 *
 * It is a `.ts` for the reason the whole core of `src/dynamic-form/`
 * is: the unit runner collects `.ts` files under `src` in a node
 * environment, so a decision living in a `.tsx` is reachable by no
 * test in this package at all.
 *
 * ## A node is a place to STAND, so a leaf member is not one
 *
 * The two-column decision says exactly one flat form is mounted at a
 * time, over the node the left column has selected. So the question a
 * node answers is "is there a form here", and for a leaf the answer
 * is no: a `string` member is a BOX IN its parent's form, and a node
 * of its own would offer a drill-in to a form holding one field.
 *
 * That makes the tree exactly the CONTAINER positions. The root is
 * the one node that is a member of nothing, which is why
 * {@link buildFormTree} takes a `ContainerFieldDef` rather than any
 * def: a tree rooted at a leaf would hold one node with no fields and
 * nothing to draw, and refusing that at the signature costs less than
 * discovering it on screen.
 *
 * A list whose item def is a LEAF reads as an exception and is not
 * one. Its items are leaf members, so they are boxes in the list's
 * own form: the list node carries no children however many items the
 * value holds, and `./NodeForm.tsx` draws them inline rather than as
 * drill-in rows. One rule, two renderings.
 *
 * ## The value is read for ARITY, never for content
 *
 * A def says a list exists; only the value says how many items are in
 * it, and each item is a node. That is the whole of why this module
 * takes a value, and the whole of what it reads one for — a count,
 * and the step from a container to the container inside it. No node
 * carries a value and nothing here reads a leaf's.
 *
 * Reading a value AT a path belongs to `./values.ts`, and the split
 * is what keeps a rebuilt tree from becoming a second copy of the
 * data: a node carries its path, the mounted form asks `./values.ts`
 * what sits there, and one authority answers what a field holds.
 *
 * A value disagreeing with its defs is expected rather than refused
 * — fixtures drift and a payload can arrive from anywhere. A list
 * position holding a non-array reads as no items and an object
 * position holding a non-object reads as no members, so the tree
 * degrades to the nodes it can prove rather than throwing where an
 * operator is the one who would see it.
 *
 * ## List item labels are POSITIONAL, so the contract stays at four
 *
 * An item's label is its item def's own label plus its position:
 * `Term` at index 0 is `Term 1`. That is a reading of two things the
 * contract already carries, which is the point — the alternative is
 * a per-item label member on `FieldDef`, and there is nowhere for one
 * to come from. A list is homogeneous by construction here, so its
 * items differ only in where they sit.
 *
 * The number is ONE-based while a path index is zero-based, and the
 * two are deliberately different readings: the label is read by an
 * operator and the index by a walk. Conflating them is how the first
 * item becomes `Term 0` on somebody's screen.
 *
 * A label is therefore NOT unique across a tree — two lists holding
 * three items apiece both spell `Term 1`. Nothing here keys on a
 * label; `pathKey` is what identifies a node, which is why both
 * projections below spell their key from the path.
 *
 * ## One walk, so `nodeAt` and `breadcrumbTo` cannot disagree
 *
 * Both read a single private trail — the nodes from the root down to
 * the named one. {@link nodeAt} answers its last member and
 * {@link breadcrumbTo} answers all of them, so the invariant a
 * consumer leans on holds by construction rather than by two walks
 * agreeing: an empty breadcrumb and a `null` node are one fact about
 * one path, and `./tree.test.ts` reads them as a pair.
 *
 * `null` rather than `undefined` follows `../data/types.ts`'s rule
 * that an absent value is spelled once, as `parentPath` does.
 *
 * A path naming no node is a real state rather than only a bug. A
 * path to a LEAF member names none by the rule above, and so does a
 * path to a list index the value does not hold — which is exactly
 * what a selection becomes after a reorder or a delete.
 *
 * ## What the two projections drop, and why
 *
 * {@link breadcrumbTo} answers `@ar/ui`'s own `SelectionItem`, so a
 * change to what that component takes reddens `check-types` HERE
 * rather than at the single call site handing it over. The import is
 * `import type` and therefore erased, which is what keeps a node
 * environment's unit run from pulling in a React and CSS package.
 *
 * {@link treeNavNodes} answers {@link TreeNavNode} — a key, a label
 * and children, and nothing else. Dropping the path and the def IS
 * the tree component's genericity: one taking `FormNode` would know
 * about `FieldDef`, and would be an app component living in a
 * library. The key is `pathKey`'s spelling, so the component reports
 * a selection as a string this module's caller turns back into a
 * path.
 *
 * ## Not frozen, unlike `ROOT_PATH`
 *
 * A tree is built fresh per render rather than shared as a module
 * constant, so the hazard the freeze over there covers — one stray
 * write moving the value every consumer starts from — does not
 * exist here. The `readonly` members refuse a write from anything
 * that type-checks, which is every consumer in this app, and a deep
 * freeze would cost a second walk of the whole tree to buy the rest.
 *
 * ## Mutation note — what the colocated cases actually catch
 *
 * A green suite is not evidence a case can fail, so each claim was
 * measured by breaking it. Every leg reddens
 * `bun x vitest run src/dynamic-form/tree.test.ts` and restores this
 * file byte-identical:
 *
 * - Dropping `objectChildren`'s `isContainerField` filter reds 20 of
 *   the 22: a leaf member becoming a node moves a child count almost
 *   everywhere. Dropping `listChildren`'s leaf guard reds exactly
 *   ONE — the list-of-leaves case, which is the only case that
 *   defends it, and saying so is the point of counting.
 * - Numbering item labels from zero reds 6; taking the label from
 *   the LIST's own def rather than the item's reds 6 as well.
 * - `trailTo` answering its partial trail rather than `[]` at a
 *   segment naming no child reds 3, one of them the case that reads
 *   the two projections as a pair — which is the single walk showing
 *   up as a single leg.
 * - Dropping `trailTo`'s root-prefix guard reds 1: a path branching
 *   away from this tree's root resolves to a node again.
 * - {@link treeNavNodes} keying on the label rather than the path
 *   reds 5, the two-lists-one-label case among them.
 *
 * The union directions need `check-types` rather than the suite, and
 * the axis that reaches this module is NOT the one it reads like.
 * Measured, with the container roster and the def union mutated
 * separately:
 *
 * - A third member added to `ContainerFieldType` does not reach this
 *   file AT ALL. `ContainerFieldDef` is a union of two INTERFACES
 *   whose discriminants are fixed literals, so widening the roster
 *   leaves `childNodes`'s switch total and its default branch still
 *   `never`. The one error is in `./fieldDef.test.ts`.
 * - A third container INTERFACE added to `ContainerFieldDef` is the
 *   addition direction that does reach it: EXIT 2 — tsc's code for
 *   a type error, never 1 — with TS2345 at `childNodes`'s default
 *   branch naming the added type.
 * - REMOVAL is the roster's axis after all: dropping `'object'` from
 *   `ContainerFieldType` reds TS2322 at `./tree.test.ts`'s typed
 *   `CONTAINER_TYPES` literal. There is no TS2678 at the switch,
 *   for the same reason the first bullet gives — its cases come
 *   from the interfaces and not from the roster.
 */

import type {
  ContainerFieldDef,
  FieldDef,
  ListFieldDef,
  ObjectFieldDef,
} from './fieldDef';
import type { NodePath } from './nodePath';
import type { SelectionItem } from '@ar/ui';

import { isContainerField } from './fieldDef';
import {
  childPath,
  indexSegment,
  keySegment,
  pathKey,
  ROOT_PATH,
  samePath,
} from './nodePath';

/**
 * What the FIRST item of a list is numbered in its label.
 *
 * Named rather than written as a `+ 1`, because it is the one place
 * the operator-facing numbering and the zero-based path index are
 * deliberately one apart.
 */
const FIRST_ITEM_NUMBER = 1;

/**
 * One position an operator can select, and everything under it.
 *
 * Container positions only — see the header: a leaf member is a box
 * in this node's form rather than a node of its own.
 */
export interface FormNode {
  /**
   * Where this node sits, absolute from the tree's root.
   *
   * The node's identity: `pathKey` spells it, `./values.ts` reads a
   * value at it, and the shell holds one of these in state.
   */
  readonly path: NodePath;
  /**
   * What the left column and the breadcrumb call this node.
   *
   * Its def's own label, except for a list item, which is numbered
   * by position — so a label is not unique across a tree.
   */
  readonly label: string;
  /**
   * The def this node was built from.
   *
   * Narrowed to a container, which is what lets `./NodeForm.tsx`
   * reach `fields` or `item` with no cast and no second guard.
   */
  readonly def: ContainerFieldDef;
  /**
   * The container positions directly under this one.
   *
   * Empty at a node whose members are all leaves, at a list whose
   * item def is a leaf, and at a list the value holds no items for.
   * Those are three different reasons for one honest answer.
   */
  readonly children: readonly FormNode[];
}

/**
 * A node as a generic tree component sees it.
 *
 * Deliberately not {@link FormNode}: no path and no def, so nothing
 * drawing this knows what a `FieldDef` is. See the header for why
 * that is the promotion's whole point.
 */
export interface TreeNavNode {
  /** `pathKey`'s spelling of the node's path, unique in the tree. */
  readonly key: string;
  /** What to draw, which is {@link FormNode.label} unchanged. */
  readonly label: string;
  /** The nodes nested under this one, projected the same way. */
  readonly children: readonly TreeNavNode[];
}

/**
 * The branch a total switch over a container's type has nothing left
 * for.
 *
 * The parameter is `never` while the container types are exactly two,
 * so a third reddens the CALL rather than reaching the throw. It
 * still throws, for the reason `./fieldDef.ts` gives at its own: the
 * compiler's guarantee stops at this app's boundary, and a def out of
 * a payload can carry a type no case claims.
 *
 * @param type - The container type no case above claimed.
 * @returns Never; the call does not return.
 * @throws Always, naming the type that reached it.
 */
function unreachableContainer(type: never): never {
  throw new Error(`Unknown container field type: ${String(type)}`);
}

/**
 * Whether a value behaves like a plain record for the walk below.
 *
 * Arrays are objects to `typeof` and so is `null`; neither is what
 * "an object with named members" means here. Same reading
 * `../components/jsonDraft.ts` takes of the same question.
 *
 * @param value - Anything at all.
 * @returns Whether it is a non-null, non-array object.
 */
function isPlainObject(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object'
    && value !== null
    && !Array.isArray(value);
}

/**
 * The items a list position holds, or none.
 *
 * The arity reading the header describes, and the only question this
 * module asks a list value.
 *
 * @param value - Whatever sits at a list position.
 * @returns Its items, or an empty list if it is not an array.
 */
function listItems(value: unknown): readonly unknown[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value;
}

/**
 * What sits at one named member of an object position.
 *
 * `Object.hasOwn` rather than a plain read, so an inherited member —
 * `constructor`, or anything reached through a prototype — answers
 * absent rather than handing a function to a walk expecting data.
 *
 * @param value - Whatever sits at an object position.
 * @param key - The member to read.
 * @returns Its value, or `undefined` if there is no such member.
 */
function memberValue(value: unknown, key: string): unknown {
  if (!isPlainObject(value) || !Object.hasOwn(value, key)) {
    return undefined;
  }

  return value[key];
}

/**
 * What one list item is called.
 *
 * The positional derivation the header argues for, spelled once.
 *
 * @param item - The list's item def, whose label every item shares.
 * @param index - The item's zero-based position.
 * @returns The label, numbered from {@link FIRST_ITEM_NUMBER}.
 */
function itemLabel(item: FieldDef, index: number): string {
  return `${item.label} ${index + FIRST_ITEM_NUMBER}`;
}

/**
 * One node, and every node under it.
 *
 * The label is a parameter rather than read off the def, which is
 * exactly where a list item differs from every other node.
 *
 * @param def - The container this node stands at.
 * @param label - What to call it.
 * @param path - Where it sits.
 * @param value - Whatever sits there, read for arity alone.
 * @returns A new node.
 */
function formNode(
  def: ContainerFieldDef,
  label: string,
  path: NodePath,
  value: unknown,
): FormNode {
  return {
    path,
    label,
    def,
    children: childNodes(def, path, value),
  };
}

/**
 * The nodes under a list position: one per item, if items are nodes.
 *
 * A leaf item def answers none whatever the value holds, which is the
 * header's list-of-strings case rather than an oversight.
 *
 * @param def - The list def.
 * @param path - Where the list sits.
 * @param value - Whatever sits there.
 * @returns One node per item, or none.
 */
function listChildren(
  def: ListFieldDef,
  path: NodePath,
  value: unknown,
): readonly FormNode[] {
  const { item } = def;

  if (!isContainerField(item)) {
    return [];
  }

  return listItems(value).map((each, index) => formNode(
    item,
    itemLabel(item, index),
    childPath(path, indexSegment(index)),
    each,
  ));
}

/**
 * The nodes under an object position: its container members.
 *
 * The filter is the header's rule in one line — a leaf field becomes
 * a box in this node's form and never a node.
 *
 * @param def - The object def.
 * @param path - Where the object sits.
 * @param value - Whatever sits there.
 * @returns One node per container member, in declared order.
 */
function objectChildren(
  def: ObjectFieldDef,
  path: NodePath,
  value: unknown,
): readonly FormNode[] {
  return def.fields.filter(isContainerField).map((field) => formNode(
    field,
    field.label,
    childPath(path, keySegment(field.key)),
    memberValue(value, field.key),
  ));
}

/**
 * The nodes under one container, whichever container it is.
 *
 * @param def - The container to descend from.
 * @param path - Where it sits.
 * @param value - Whatever sits there.
 * @returns Its child nodes.
 * @throws If the def carries a container type outside the two, which
 * `check-types` rules out for every def written in this app.
 */
function childNodes(
  def: ContainerFieldDef,
  path: NodePath,
  value: unknown,
): readonly FormNode[] {
  // Switched on the DESTRUCTURED discriminant, as `./fieldDef.ts`
  // and `./nodePath.ts` are: narrowing `def` itself to `never` takes
  // its members with it, and the default branch then reports the
  // wrong thing (TS2339) instead of naming the added type.
  const { type } = def;

  switch (type) {
    case 'list':
      return listChildren(def, path, value);
    case 'object':
      return objectChildren(def, path, value);
    default:
      return unreachableContainer(type);
  }
}

/**
 * The nodes from the tree's root down to the one a path names.
 *
 * Private, and the single walk {@link nodeAt} and
 * {@link breadcrumbTo} are both readings of — see the header for why
 * they are one function rather than two.
 *
 * Empty when the path names no node, which covers three cases: a
 * path that branches away from this tree's own root, a segment
 * naming no child at the depth it sits, and a path to a leaf member,
 * which by the header's rule is never a node.
 *
 * @param tree - The node to walk from, root or subtree.
 * @param path - The absolute path to resolve.
 * @returns The trail, root first; empty if the path names no node.
 * @throws If either path carries a segment kind `./nodePath.ts` does
 * not declare.
 */
function trailTo(tree: FormNode, path: NodePath): readonly FormNode[] {
  const rootDepth = tree.path.length;

  // The guard that keeps a path from ANOTHER branch from resolving:
  // the walk below only ever compares the segments below this depth,
  // so without it a path sharing a suffix would come back as a node.
  if (!samePath(path.slice(0, rootDepth), tree.path)) {
    return [];
  }

  return path.slice(rootDepth).reduce<readonly FormNode[]>(
    (trail, segment) => {
      const node = trail.at(-1);

      if (node === undefined) {
        return trail;
      }

      const wanted = childPath(node.path, segment);
      const child = node.children
        .find((each) => samePath(each.path, wanted));

      if (child === undefined) {
        return [];
      }

      return [...trail, child];
    },
    [tree],
  );
}

/**
 * The node tree for one def over one value.
 *
 * @param def - The container the tree is rooted at.
 * @param value - Whatever the whole structure currently holds; read
 * for arity alone, and never written to.
 * @returns A new tree, rooted at `ROOT_PATH`.
 * @throws If any def in the walk carries a container type outside the
 * two, which `check-types` rules out for defs written in this app.
 */
export function buildFormTree(
  def: ContainerFieldDef,
  value: unknown,
): FormNode {
  return formNode(def, def.label, ROOT_PATH, value);
}

/**
 * The node a path names, or `null` if it names none.
 *
 * @param tree - The tree to resolve against.
 * @param path - The absolute path to resolve.
 * @returns The node, or `null`.
 * @throws If either path carries a segment kind `./nodePath.ts` does
 * not declare.
 */
export function nodeAt(
  tree: FormNode,
  path: NodePath,
): FormNode | null {
  return trailTo(tree, path).at(-1) ?? null;
}

/**
 * The breadcrumb trail to a node, as `@ar/ui`'s `Breadcrumb` takes
 * it.
 *
 * Root first and inclusive of the named node, so the caller's
 * `index` is the last position rather than a number it computes some
 * other way.
 *
 * Empty exactly when {@link nodeAt} answers `null`, both being
 * readings of one walk.
 *
 * @param tree - The tree to resolve against.
 * @param path - The absolute path to resolve.
 * @returns One item per node on the way; empty if the path names no
 * node.
 * @throws If either path carries a segment kind `./nodePath.ts` does
 * not declare.
 */
export function breadcrumbTo(
  tree: FormNode,
  path: NodePath,
): readonly SelectionItem[] {
  return trailTo(tree, path).map((node) => ({
    key: pathKey(node.path),
    label: node.label,
  }));
}

/**
 * One node projected for a generic tree component.
 *
 * @param node - The node to project.
 * @returns Its key, label and projected children.
 * @throws If the node's path carries a segment kind `./nodePath.ts`
 * does not declare.
 */
function navNode(node: FormNode): TreeNavNode {
  return {
    key: pathKey(node.path),
    label: node.label,
    children: node.children.map(navNode),
  };
}

/**
 * The whole tree, as the `nodes` a tree component draws.
 *
 * A one-member forest rather than a bare node: the root IS selectable
 * and has to be drawn — it is where a list's own form, and so the
 * reorder, lives — and a forest is what a tree component's `nodes`
 * prop takes, so nothing has to special-case the top level.
 *
 * @param tree - The tree to project.
 * @returns The root, projected, as the only member of a forest.
 * @throws If any node's path carries a segment kind `./nodePath.ts`
 * does not declare.
 */
export function treeNavNodes(tree: FormNode): readonly TreeNavNode[] {
  return [navNode(tree)];
}
