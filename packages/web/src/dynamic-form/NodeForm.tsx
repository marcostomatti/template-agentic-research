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
 * ## A reorder moves the VOCABULARY and leaves the ids
 *
 * `../pages/lexicon/terms.ts` states the rule this form inherits.
 * A term payload carries no `id` and no `categoryId` — those
 * are the members an operator may not change — so it is a
 * category's VOCABULARY rather than its rows, and an edited
 * payload is re-associated with the rows it is a reading of BY
 * POSITION: entry `n` keeps row `n`'s id and category and takes
 * the four members the operator may write. That module's own words
 * for the consequence are that reordering entries "reorders the
 * vocabulary and leaves the ids where they are, which costs
 * nothing", `terms` recording no order at all.
 *
 * A list's ARITY is the other half of the same rule and the reason
 * v1 offers no add and no remove: a payload with one more entry
 * MINTS a row and one with fewer REMOVES one, so an add control
 * would be a row-lifecycle decision made in a renderer, and the
 * JSON presentation beside this one is where a length changes.
 *
 * So dragging the second row above the first moves no record: it
 * rewrites what rows 1 and 2 SAY, in one write, and the ids the
 * save path matches on stay where they were. Which is why a
 * reorder leaves this file exactly the way a keystroke does —
 * as a report the shell turns into one `./values.ts` call and one
 * schema reading — and why a row needs no identity of its own:
 * position IS the identity, so {@link ListRow.key} is the item's
 * path key and a leaf row's half-typed text belongs to the
 * POSITION rather than to the item that was there.
 *
 * ## One `group`, and deliberately no `onReceive`
 *
 * `Sortable` reads what a drop MEANS off the drag's data type,
 * built as its own prefix plus this list's `group`: its own type
 * is an internal reorder, any other sort type is a cross-list
 * receive, and `onReceive` is what a receive needs to do anything.
 * Its absence is not an omission — the component's handlers
 * return before `preventDefault` for a cross drag when there is no
 * receiver, so a drag out of any other list is REFUSED rather than
 * landing unannounced, and the prefix being the library's own
 * makes that cover every `Sortable` mounted beside this one. One
 * group is what v1 needs, the drag decision being FLAT-PER-LEVEL;
 * `../pages/lexicon/LexiconEditorModal.tsx` argues for three and
 * the rulings agree, its buckets differing because a cross-bucket
 * drop is a polarity change it wants to HONOUR.
 *
 * ## Two gestures, one call — and the derivation between them
 *
 * `Sortable` is HTML5 drag-and-drop over `dataTransfer` and has no
 * keyboard path at all, so the move-up and move-down controls on
 * every row are the MECHANISM and the drag is the enhancement.
 * That is the ruling the lexicon modal makes for its polarity
 * control and the criterion it answers: WCAG 2.2 SC 2.5.7 asks for
 * a keyboard-reachable equivalent of a dragging movement, and one
 * that is a second implementation of the same behaviour would
 * satisfy it only until the two drifted. They cannot drift here,
 * as a property of the code: both gestures reach
 * {@link ListNodeForm}'s single report and the shell answers it
 * with one `withListReordered` call, neither path writing a value
 * or carrying a move implementation of its own.
 *
 * One asymmetry survives that, and `./values.ts` names it from its
 * own side: `withListReordered` takes the position an item LANDS
 * at, which is what a control needs (`from - 1` for up,
 * `from + 1` for down), while `Sortable` works in insertion GAPS
 * and reports a drop by handing back the whole next ORDER. So the
 * pointer path owes a translation, {@link moveFromOrder}, the one
 * place the two could still disagree. Every row carries the
 * position it came from, so the order arrives as a permutation of
 * `0..n-1` and the move reads with no equality on the items
 * themselves, two being free to be identical.
 * {@link keepsRelativeOrder} guards that reading by asking what
 * separates a move from any other permutation — with the moved
 * row taken out, is the rest still in order? — rather than by
 * rebuilding the order, which would be the duplicate this section
 * exists to avoid. Nothing in either gate reaches the derivation,
 * a static render firing no `onReorder`; the reorder spec under
 * `../../tests/e2e/` measures it, and its claim is the one this
 * rests on — that the drag and the two controls produce the
 * SAME resulting order.
 *
 * ## The grip is the handle
 *
 * `Sortable` puts `draggable` on the wrapper around each row, so
 * by default every pixel starts a drag — a press on a drill-in
 * button included, and a text selection inside a leaf item's box,
 * the trap `../pages/lexicon/LexiconEditorModal.tsx` opts its
 * weight input out of one input at a time. This file opts out by
 * ROW: the content and the move controls are both
 * `draggable={false}`, leaving `SortableRow`'s grip as the only
 * thing a drag starts from, which makes the glyph and the real
 * affordance agree and reaches boxes this file does not own.
 *
 * ## What a row is CALLED
 *
 * A list's items share one def, so `def.item.label` would give the
 * tree, the breadcrumb and the form three rows with one name.
 * `./tree.ts` already solved that by numbering an item from its
 * position, so {@link rowLabel} DERIVES the label from that
 * module's output wherever there is any. A LEAF item has no node,
 * so the fallback composes its own: the one spelling that drifts.
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
 * instead reds TS2345 alone. Dropping `'down'` from
 * {@link MoveDirection} is TS2322 at the roster literal plus
 * TS2353 at both keyed tables. And the axis a reader assumes is
 * covered and is not: a third CONTAINER TYPE reds NOTHING here,
 * landing in `./registry.ts` and a sibling fixture, where a third
 * DEF-union member is TS2345 at the default branch.
 *
 * An offline static render prints the real markup with no DOM and
 * no runner, and the same probe reaches the derivation by calling
 * these components as the plain functions they are and reading
 * `onReorder` off the `Sortable` element. 62 readings, shown
 * discriminating by 29 mutation legs reddening 57 of them. The
 * three DEAD legs each name a claim the probe cannot reach: a
 * label whose two spellings agree today, a key whose uniqueness
 * is about another node, a glyph inside an already-hidden svg.
 * What none of it reaches is the drag, which is Playwright's.
 */

import type { LeafValue } from './FieldControl';
import type {
  FieldDef,
  ListFieldDef,
  ObjectFieldDef,
} from './fieldDef';
import type { NodePath } from './nodePath';
import type { FormNode } from './tree';

import { Sortable, SortableRow, Touchable } from '@ar/ui';

import { FieldControl } from './FieldControl';
import {
  childPath,
  indexSegment,
  keySegment,
  pathKey,
} from './nodePath';
import { readValueAt } from './values';

/** The one namespace; anything else is refused, per the header. */
const DRAG_GROUP = 'dynamic-form-list';

/** What an empty list says, adding one being no gesture v1 has. */
const EMPTY_LIST_HINT = 'Nothing here yet';

/** The verb both move controls open their accessible name with. */
const MOVE_VERB = 'Move';

/** The number the first item is called, per {@link rowLabel}. */
const FIRST_ITEM_NUMBER = 1;

/** Which way a move control moves its row. */
type MoveDirection = 'up' | 'down';

/**
 * The two directions, in the order the controls are drawn.
 * Annotated rather than inferred, for the direction only the
 * annotation guards: a member REMOVED from {@link MoveDirection}
 * reddens at the literal that still names it, where the two keyed
 * tables report a member ADDED. Neither covers the other.
 */
const MOVE_DIRECTIONS: readonly MoveDirection[] = ['up', 'down'];

/**
 * How far each direction moves a row: `./values.ts`'s own two
 * readings, spelled once so move and DISABLED share one arithmetic.
 */
const MOVE_OFFSET: Readonly<Record<MoveDirection, number>> = {
  up: -1,
  down: 1,
};

/** The chevron each direction draws, as an SVG path. */
const MOVE_GLYPH: Readonly<Record<MoveDirection, string>> = {
  up: 'M18 15l-6-6-6 6',
  down: 'M6 9l6 6 6-6',
};

/** The column both branches lay their members out in. */
const FORM_COLUMN = 'flex flex-col gap-3';

/**
 * A move control's own chrome, `Touchable` supplying the focus
 * ring, the press transform and the disabled treatment. Sunk is
 * deliberately NOT the token: `../components/JsonEditor.tsx` fixed
 * its meaning as "not where you type".
 */
const MOVE_CONTROL = 'size-7 shrink-0 justify-center rounded-md '
  + 'border border-border-soft bg-surface-1 text-fg3 '
  + 'transition-colors hover:border-border-strong hover:text-fg1';

/** The pair of move controls, held apart from the row's content. */
const MOVE_GROUP = 'flex shrink-0 items-center gap-1';

/**
 * One item of a list, as this file's rows and `Sortable` see it.
 * Built once per render in {@link listRows}: every member is a
 * reading of one position, and computing them apart is what lets
 * them disagree.
 */
interface ListRow {
  /** The item's path key: positional, per the header. */
  readonly key: string;
  /** Where the item sits in the list as it stands. */
  readonly index: number;
  /** What the row is called, and its controls named after. */
  readonly label: string;
  /**
   * The list's item def with {@link ListRow.label} written over
   * it, so the control this row draws is named after the ROW
   * rather than after the shape every row shares.
   */
  readonly def: FieldDef;
  /** The item's absolute path, reported with every edit. */
  readonly path: NodePath;
  /** Whatever the value holds at that position. */
  readonly value: unknown;
}

/** A move, in the convention `./values.ts` takes. */
interface ListMove {
  /** Where the item is now. */
  readonly from: number;
  /** Where it LANDS, which is that convention's whole point. */
  readonly to: number;
}

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
 * The items a list position holds, or none — the arity reading
 * `./tree.ts` takes of the same question.
 *
 * @param value - Whatever sits there.
 * @returns Its items, or none if it is not an array.
 */
function listItems(value: unknown): readonly unknown[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value;
}

/**
 * Whether a position is one the list actually has.
 *
 * @param index - The position to test.
 * @param count - How many items the list holds.
 * @returns Whether it has it.
 */
function isItemPosition(index: number, count: number): boolean {
  return index >= 0 && index < count;
}

/**
 * Where a direction moves a row to, off either end included.
 *
 * @param index - Where the row is now.
 * @param direction - Which way it moves.
 * @returns The destination.
 */
function moveTarget(index: number, direction: MoveDirection): number {
  return index + MOVE_OFFSET[direction];
}

/**
 * What one list item is called: `./tree.ts`'s own node label
 * wherever there is one, composed only where there is none.
 *
 * @param node - The node being drawn.
 * @param item - The item def, whose label every item shares.
 * @param index - Its zero-based position.
 * @returns The label the row, tree and breadcrumb share.
 */
function rowLabel(
  node: FormNode,
  item: FieldDef,
  index: number,
): string {
  return node.children[index]?.label
    ?? `${item.label} ${index + FIRST_ITEM_NUMBER}`;
}

/**
 * Every row of one list node, in the order the value holds them.
 *
 * @param node - The node being drawn.
 * @param def - Its def, narrowed by the caller's switch.
 * @param value - The whole structure, read at the node's path.
 * @returns One row per item; none where there are none.
 * @throws If a segment carries a kind `./nodePath.ts` disowns.
 */
function listRows(
  node: FormNode,
  def: ListFieldDef,
  value: unknown,
): readonly ListRow[] {
  const items = listItems(readValueAt(value, node.path));

  return items.map((item, index) => {
    const path = childPath(node.path, indexSegment(index));
    const label = rowLabel(node, def.item, index);

    return {
      key: pathKey(path),
      index,
      label,
      def: { ...def.item, label },
      path,
      value: item,
    };
  });
}

/**
 * Whether every row but the moved one kept its relative order —
 * the question separating a MOVE from any other permutation. A
 * swap of two non-neighbours answers `false` and is refused, where
 * the span reading alone would write it as a move.
 *
 * @param origins - Where each reported row came from.
 * @param from - The position the moved row came from.
 * @returns Whether the rest are still ascending.
 */
function keepsRelativeOrder(
  origins: readonly number[],
  from: number,
): boolean {
  const others = origins.filter((origin) => origin !== from);

  return others.every((origin, at) => {
    const before = others[at - 1];

    return before === undefined || origin > before;
  });
}

/**
 * The move a reported order describes, or none.
 *
 * The pointer path's whole translation: a single move displaces a
 * contiguous span and the moved row is at one end of it — moved
 * forward it landed at the LAST displaced position carrying the
 * FIRST one's origin, moved backward at the first carrying the
 * last one's. `null` covers four states that all mean "do nothing"
 * and are kept apart in the reading rather than in the answer: an
 * order displacing no row, one whose length no longer matches the
 * list, one whose ends read as no move, and one
 * {@link keepsRelativeOrder} refuses.
 *
 * @param rows - The order `Sortable` reported.
 * @param count - How many items the list holds now.
 * @returns The move to make, or `null` to make none.
 */
function moveFromOrder(
  rows: readonly ListRow[],
  count: number,
): ListMove | null {
  if (rows.length !== count) {
    return null;
  }

  const origins = rows.map((row) => row.index);
  const displaced = origins
    .map((origin, at) => ({ origin, at }))
    .filter(({ origin, at }) => origin !== at);
  const first = displaced.at(0);
  const last = displaced.at(-1);

  if (first === undefined || last === undefined) {
    return null;
  }

  // Which end the moved row landed at. BOTH hold for a swap of two
  // neighbours, where either reading rebuilds the same list, so
  // forward is simply taken first rather than treated as ambiguous.
  const forward = last.origin === first.at;
  const backward = first.origin === last.at;

  if (!forward && !backward) {
    return null;
  }

  const move = forward
    ? { from: first.at, to: last.at }
    : { from: last.at, to: first.at };

  return keepsRelativeOrder(origins, move.from)
    ? move
    : null;
}

/** What one move control is given. */
interface MoveControlProps {
  /** Which way it moves its row. */
  readonly direction: MoveDirection;
  /** The row it moves, for its position and its name. */
  readonly row: ListRow;
  /** How many items the list holds, for the ends. */
  readonly count: number;
  /** Report the move, in `./values.ts`'s convention. */
  readonly onMove: (from: number, to: number) => void;
}

/**
 * One row's move control: the keyboard path's whole mechanism.
 * Named after the ROW rather than the direction alone, so the two
 * controls of one row and the same control of two rows are all
 * distinguishable by accessible name — which is what lets a
 * spec read a list's order off its controls rather than off text
 * that may carry a stamp. The direction's own word IS the word the
 * name ends with, so the union and the sentence cannot drift. The
 * glyph is drawn here, `@ar/ui`'s stroke-icon helper being
 * internal, and is `aria-hidden` so the name is the sentence.
 *
 * @param props - The direction, the row, the list's length, the
 * move to report.
 * @returns The control.
 */
const MoveControl = ({
  direction,
  row,
  count,
  onMove,
}: MoveControlProps) => {
  // One arithmetic for both the move and the affordance, per
  // MOVE_OFFSET: the control is disabled exactly where the
  // destination is a position the list does not have.
  const target = moveTarget(row.index, direction);

  return (
    <Touchable
      inline
      aria-label={`${MOVE_VERB} ${row.label} ${direction}`}
      className={MOVE_CONTROL}
      disabled={!isItemPosition(target, count)}
      onClick={() => {
        onMove(row.index, target);
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d={MOVE_GLYPH[direction]} />
      </svg>
    </Touchable>
  );
};

/** What one list item's row is given. */
interface ListItemRowProps {
  /** The item, read once by {@link listRows}. */
  readonly row: ListRow;
  /** How many items the list holds, for the ends. */
  readonly count: number;
  /** Report a value that read, at the path it belongs to. */
  readonly onValueChange: (path: NodePath, next: LeafValue) => void;
  /** Report that this row's own container was pressed. */
  readonly onDrillIn: (path: NodePath) => void;
  /** Report a move, in `./values.ts`'s convention. */
  readonly onMove: (from: number, to: number) => void;
}

/**
 * One item of a list: whatever its def draws, and the pair of
 * controls that move it. The content is
 * `./FieldControl.tsx` unchanged, so a list of
 * objects gets drill-in rows and a list of strings gets boxes with
 * nothing here branching on which. Both it and the controls opt
 * out of the drag — the grip is the handle, per the header.
 *
 * @param props - The row, the list's length, its three reports.
 * @returns The row.
 */
const ListItemRow = ({
  row,
  count,
  onValueChange,
  onDrillIn,
  onMove,
}: ListItemRowProps) => (
  <SortableRow
    className="items-center"
    trailing={(
      <div draggable={false} className={MOVE_GROUP}>
        {MOVE_DIRECTIONS.map((direction) => (
          <MoveControl
            key={direction}
            direction={direction}
            row={row}
            count={count}
            onMove={onMove}
          />
        ))}
      </div>
    )}
  >
    <div draggable={false}>
      <FieldControl
        def={row.def}
        path={row.path}
        value={row.value}
        onValueChange={onValueChange}
        onDrillIn={onDrillIn}
      />
    </div>
  </SortableRow>
);

/**
 * What the list branch is given: the form's own props plus the def
 * {@link NodeMembers}'s switch narrowed, handed down beside the
 * node rather than read off it — which carries the narrowing
 * across the boundary and reaches `item` with no cast.
 */
interface ListNodeFormProps extends NodeFormProps {
  /** The node's own def, narrowed to a list. */
  readonly def: ListFieldDef;
}

/**
 * A list node's members: its items, sortable. The one place both
 * gestures converge: `reorderRequest` is the single report —
 * the drop derives its pair through {@link moveFromOrder} and the
 * controls hand theirs straight over.
 *
 * @param props - The node, its def, the value, its three reports.
 * @returns The sortable list of rows.
 * @throws If a segment carries a kind `./nodePath.ts` disowns.
 */
const ListNodeForm = ({
  node,
  def,
  value,
  onValueChange,
  onDrillIn,
  onReorder,
}: ListNodeFormProps) => {
  const rows = listRows(node, def, value);
  const reorderRequest = (from: number, to: number) => {
    onReorder(node.path, from, to);
  };

  return (
    <Sortable
      group={DRAG_GROUP}
      items={rows}
      getKey={(row) => row.key}
      emptyHint={EMPTY_LIST_HINT}
      onReorder={(next: readonly ListRow[]) => {
        const move = moveFromOrder(next, rows.length);

        if (move !== null) {
          reorderRequest(move.from, move.to);
        }
      }}
      renderItem={(row) => (
        <ListItemRow
          row={row}
          count={rows.length}
          onValueChange={onValueChange}
          onDrillIn={onDrillIn}
          onMove={reorderRequest}
        />
      )}
    />
  );
};

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
 * @param props - The node, its def, and the value.
 * @returns The fields, in declared order.
 * @throws If a segment carries a kind `./nodePath.ts` disowns.
 */
const ObjectNodeForm = ({
  node,
  def,
  value,
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
 * @param props - The node, the value, and its three reports.
 * @returns The form.
 * @throws If the def carries a container type outside the two.
 */
export const NodeForm = ({
  node,
  value,
  onValueChange,
  onDrillIn,
  onReorder,
}: NodeFormProps) => (
  <div role="group" aria-label={node.label} className={FORM_COLUMN}>
    <NodeMembers
      node={node}
      value={value}
      onValueChange={onValueChange}
      onDrillIn={onDrillIn}
      onReorder={onReorder}
    />
  </div>
);
