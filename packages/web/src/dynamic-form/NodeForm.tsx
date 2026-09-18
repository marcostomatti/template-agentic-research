/**
 * @packageDocumentation
 * The ONE mounted form: every member of the selected node, flat.
 *
 * The two-column decision is what this file is the right half of.
 * `./tree.ts` holds the recursion and holds no field state, and
 * exactly one of these forms is mounted at a time over the node
 * the shell selected — so there is no recursive form here, no
 * field-array registration and no cross-form coordination. The
 * branches split where `./fieldDef.ts` splits the container types:
 * an OBJECT node draws its declared fields in order, leaves as
 * controls and containers as drill-in rows and neither knowing
 * which it is, and a LIST node draws one row per ITEM, inside
 * `@ar/ui`'s `Sortable`.
 *
 * ## The list branch lives in `./ListNodeForm.tsx`
 *
 * Only the OBJECT branch is written out below. The list branch
 * is one `map` plus `Sortable`, a pair of move controls on every
 * row, and the derivation that makes a drop and a keypress the
 * same report — enough that keeping it here left one file
 * nobody could read whole, so it sits in `./ListNodeForm.tsx`
 * with the sections that document it: why a reorder moves the
 * VOCABULARY and leaves the ids, why there is one drag `group`
 * and deliberately no `onReceive`, how the two gestures reach one
 * call, why the grip is the handle, and what a row is CALLED.
 * The split moved code and nothing else: {@link NodeFormProps} is
 * still declared here and that file extends it, so the narrowing
 * the switch below performs crosses the boundary with the def and
 * no branch re-reads it.
 *
 * ## No test in this package reaches this file
 *
 * A fact about the runner rather than an omission, and the one
 * `./FieldControl.tsx` records: `@ar/web` runs vitest over `src` in
 * a NODE environment with an include of `*.test.ts`, so a `.tsx` is
 * neither collected nor renderable there. Which is why everything
 * worth asserting sits next door, in the colocated cases over the
 * five modules this one composes. What is left is composition, one
 * derivation and three reports, and two things measure it.
 *
 * `check-types` proves the bindings, measured from inside
 * `packages/web` at EXIT 2 every time. A leaf def handed to either
 * branch is TS2322 at the JSX prop. A reorder index typed as a
 * string reds BOTH codes whichever prop declares it — TS2345
 * at the call it broke and TS2322 at the prop forwarding the old
 * handler on — so expect one of each; mutating the ARGUMENT
 * instead reds TS2345 alone. And the axis a reader assumes is
 * covered and is not: a third CONTAINER TYPE reds NOTHING here,
 * landing in `./registry.ts` and a sibling fixture, where a third
 * DEF-union member is TS2345 at the default branch. The legs that
 * land wholly inside the list branch are listed in
 * `./ListNodeForm.tsx`'s own header instead.
 *
 * An offline static render prints the real markup with no DOM and
 * no runner, and the same probe reaches the derivation by calling
 * these components as the plain functions they are and reading
 * `onReorder` off the `Sortable` element — which is
 * `./ListNodeForm.tsx`'s, mounted from the switch below, so the
 * readings cover both files. 62 readings, shown discriminating by
 * 29 mutation legs reddening 57 of them. The three DEAD legs each
 * name a claim the probe cannot reach: a label whose two spellings
 * agree today, a key whose uniqueness is about another node, a
 * glyph inside an already-hidden svg. What none of it reaches is
 * the drag, which is Playwright's.
 */

import type { FieldActionTable } from './actions';
import type { LeafValue } from './FieldControl';
import type { ObjectFieldDef } from './fieldDef';
import type { NodePath } from './nodePath';
import type { FormNode } from './tree';

import { FieldControl } from './FieldControl';
import { ListNodeForm } from './ListNodeForm';
import { childPath, keySegment, pathKey } from './nodePath';
import { readValueAt } from './values';

/** The column both branches lay their members out in. */
const FORM_COLUMN = 'flex flex-col gap-3';

/**
 * The branch a total switch over a container's type has nothing
 * left for. The parameter is `never` while the container types are
 * exactly two, so a third reddens the CALL rather than reaching
 * the throw. It still throws, for the reason every guard here
 * gives: a def read out of a payload can carry a type no case
 * claims.
 *
 * @param type - The type no case above claimed.
 * @returns Never; the call does not return.
 * @throws Always, naming the type that reached it.
 */
function unreachableContainer(type: never): never {
  throw new Error(`Unknown container field type: ${String(type)}`);
}

/**
 * What the object branch is given, the same way, minus the one
 * report it cannot make: an object node holds no list, so
 * {@link NodeFormProps.onReorder} is `Omit`ted rather than handed
 * over unused — which makes "this branch cannot reorder" a
 * thing the compiler knows instead of a comment.
 */
interface ObjectNodeFormProps
  extends Omit<NodeFormProps, 'onReorder'> {
  /** The node's own def, narrowed to an object. */
  readonly def: ObjectFieldDef;
}

/**
 * An object node's members: its declared fields, in order.
 *
 * Every field goes through the one component whichever kind it is,
 * so the leaf-or-container split stays `./FieldControl.tsx`'s. The
 * key is the member's PATH key, load-bearing rather than tidy:
 * without it React reuses a control at a position and one member's
 * half-typed text appears in another's box.
 *
 * @param props - The node, its def, the value, and the
 * action table every leaf under it is matched against.
 * @returns The fields, in declared order.
 * @throws If a segment carries a kind `./nodePath.ts` disowns.
 */
const ObjectNodeForm = ({
  node,
  def,
  value,
  actions,
  onValueChange,
  onDrillIn,
}: ObjectNodeFormProps) => (
  <>
    {def.fields.map((field) => {
      const path = childPath(node.path, keySegment(field.key));

      return (
        <FieldControl
          key={pathKey(path)}
          def={field}
          path={path}
          value={readValueAt(value, path)}
          actions={actions}
          onValueChange={onValueChange}
          onDrillIn={onDrillIn}
        />
      );
    })}
  </>
);

/** What the one mounted form is given. */
export interface NodeFormProps {
  /**
   * The node to draw, which is the one the shell selected.
   *
   * A container by construction: `./tree.ts` builds nodes for
   * containers alone, which makes the switch total over two cases
   * rather than six.
   */
  readonly node: FormNode;
  /**
   * The whole structure, not this node's slice of it.
   *
   * Every member is read at its ABSOLUTE path through
   * `./values.ts`, the module the shell writes through, so one
   * reading of "what sits at a position" serves both directions.
   */
  readonly value: unknown;
  /**
   * Report a value that READ, at the path it belongs to.
   *
   * Forwarded to every member untouched: text that does not read
   * reaches this file not at all.
   */
  readonly onValueChange: (path: NodePath, next: LeafValue) => void;
  /**
   * The handlers every leaf under this node is matched against.
   *
   * Optional, and forwarded untouched to both branches: nothing
   * here reads an id — `./useFieldAction.tsx` does, per leaf —
   * and a node holding no action-bearing leaf never notices the
   * prop. `./DynamicForm.tsx` has already refused a def list
   * naming an id this table does not hold, so a table arriving
   * here answers every ref beneath it.
   */
  readonly actions?: FieldActionTable;
  /**
   * Report that a container member was pressed.
   *
   * A path and never a value — the shell answers by mounting
   * that node's own form in place of this one.
   */
  readonly onDrillIn: (path: NodePath) => void;
  /**
   * Report a move, at the path of the list it happened in.
   *
   * Positions in the list as it stands, `to` being where the item
   * LANDS — `withListReordered`'s convention exactly, so a
   * caller hands this report to it unchanged.
   */
  readonly onReorder: (
    path: NodePath,
    from: number,
    to: number,
  ) => void;
}

/**
 * The members of the selected node, whichever container it is.
 * Switched on the DESTRUCTURED discriminant, as every switch in
 * this directory is: narrowing `def` itself to `never` takes its
 * members with it, and the default branch then reports the wrong
 * thing instead of naming the type nobody wrote a case for. The
 * alias also carries the narrowing into each branch's `def` prop.
 *
 * @param props - Everything {@link NodeForm} was given.
 * @returns The node's members.
 * @throws If the def carries a container type outside the two.
 */
const NodeMembers = ({
  node,
  value,
  actions,
  onValueChange,
  onDrillIn,
  onReorder,
}: NodeFormProps) => {
  const { def } = node;
  const { type } = def;

  switch (type) {
    case 'list':
      return (
        <ListNodeForm
          node={node}
          def={def}
          value={value}
          actions={actions}
          onValueChange={onValueChange}
          onDrillIn={onDrillIn}
          onReorder={onReorder}
        />
      );
    case 'object':
      return (
        <ObjectNodeForm
          node={node}
          def={def}
          value={value}
          actions={actions}
          onValueChange={onValueChange}
          onDrillIn={onDrillIn}
        />
      );
    default:
      return unreachableContainer(type);
  }
};

/**
 * The one mounted flat form, for the node the shell selected.
 * A `group` rather than a landmark, the established envelope in
 * this package (`../components/FilterBadgeRow.tsx` draws the same
 * one): a set of related controls is what ARIA's `group` is for,
 * where a region would compete with the shell's own landmarks
 * inside a dialog. Its name is the node's label, so the form, the
 * tree item and the breadcrumb step all say the same thing.
 *
 * @param props - The node, the value, the action table, and its
 * three reports.
 * @returns The form.
 * @throws If the def carries a container type outside the two.
 */
export const NodeForm = ({
  node,
  value,
  actions,
  onValueChange,
  onDrillIn,
  onReorder,
}: NodeFormProps) => (
  <div role="group" aria-label={node.label} className={FORM_COLUMN}>
    <NodeMembers
      node={node}
      value={value}
      actions={actions}
      onValueChange={onValueChange}
      onDrillIn={onDrillIn}
      onReorder={onReorder}
    />
  </div>
);
