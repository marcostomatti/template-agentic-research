/**
 * @packageDocumentation
 * The other half of an action: the def names an id, and this is
 * where an id is matched against the table a caller supplies.
 *
 * `./fieldDef.ts` declares that a leaf def MAY carry
 * `action: { id, label }` and deliberately says nothing about what
 * pressing it does — see its own header on why a ref rather than a
 * function. This module holds the two things that ref implies and
 * the def cannot: the SHAPE of a handler
 * ({@link FieldAction}, {@link FieldActionContext}), and the reading
 * that a def list and an action table agree
 * ({@link resolveActions}, {@link assertActions}).
 *
 * `.specs/q20b-0-dynamic-form-enum-and-actions.md` decisions 2, 3
 * and 4 are the authority for all four.
 *
 * It is a `.ts` for the reason the whole core of `src/dynamic-form/`
 * is: the unit runner collects `.ts` files under `src` in a node
 * environment, so a decision living in a `.tsx` is reachable by no
 * test in this package at all. The refusal below is exactly the kind
 * of decision that would otherwise sit unreachable inside a
 * component's mount.
 *
 * ## What is NOT here
 *
 * No handler, no button, no pending flag and no promise. Nothing in
 * this module calls a {@link FieldAction} — it reads ids and answers
 * which of them nothing holds. Running one, drawing the control
 * beside it, holding the pending state and showing the refusal are
 * `./LeafControl.tsx`'s, which is the thin part around this.
 *
 * ## The one import that points at a `.tsx`, and what it costs
 *
 * `LeafValue` is declared in `./FieldControl.tsx`, beside the props
 * it constrains, and this module imports it: it is the union of what
 * the five readers answer, so copying it here would be two spellings
 * of one union free to drift — the thing this directory's contract
 * modules exist to prevent. `verbatimModuleSyntax` is on, so the
 * `import type` below is erased rather than emitted, and the
 * colocated cases run in the node environment with no DOM.
 *
 * What that does NOT buy is a runner that enforces the direction.
 * Measured: rewritten as a VALUE import of that file's component,
 * `bun x vitest run src/dynamic-form/actions.test.ts` still passes
 * 3 of 3 — React and `@ar/ui` load in a node environment quite
 * happily, and the only reading that moves is the cost (transform
 * 21ms -> 313ms, import 28ms -> 416ms in that pair of runs). So the
 * `.ts`-holds-the-decision rule is this directory's discipline and
 * not something a red run would report; the import below stays a
 * type import because of the rule, not because of the runner.
 *
 * ## Decision 4's contract: return a value, or nothing
 *
 * A {@link FieldAction} is handed where the field sits, the def, and
 * what is held there, and answers a {@link LeafValue}, `undefined`,
 * or a promise of either. What comes back is written through
 * `./values.ts`'s `withValueAt` — the same path a keystroke takes —
 * and REPLACES the typed text the control was holding; `undefined`
 * leaves the field as it was. A rejected promise renders beside the
 * field, in its error slot, as the action's refusal, and is never
 * thrown. An action changes no def.
 *
 * Written out here because this module declares the type and no
 * component may narrow it: `./DynamicForm.tsx`'s own TSDoc repeats
 * the contract for a caller supplying the table, and both are
 * readings of decision 4 rather than of each other.
 *
 * ## The refusal names a KEY, not a path
 *
 * `./nodePath.ts` is how every other reading in this directory says
 * WHERE, and it is the wrong answer here for a reason that is not
 * taste: a path into a list needs an INDEX, and an index comes from
 * a value. This check runs over a def list alone, before anything is
 * drawn and with no value in hand, so an item def inside a list has
 * no path to name — while it always has the `key` somebody typed in
 * the def list, which is the thing they have to edit to fix it.
 *
 * A def list holding the same key in two places therefore produces
 * two refusals that read alike. That is accepted: both are real, and
 * the id is the half that is wrong.
 *
 * ## Held is `Object.hasOwn`, not `in` and not `!== undefined`
 *
 * A table is a caller's plain object, so `'constructor'`,
 * `'toString'` and `'valueOf'` — among others `Object.prototype`
 * carries — all answer a FUNCTION through it. Tested with `in` or by reading the index, an id spelled
 * like one of those passes the check and the form then draws a
 * button wired to `Object`'s own method. {@link resolveActions}
 * refuses it instead. This is the stricter of the two directions on
 * purpose: nothing here can be fooled into accepting an id the
 * caller never wrote, and a lookup that this function has passed is
 * one the table really holds.
 *
 * ## A list, and the first of it
 *
 * {@link resolveActions} answers every ref it found, because a def
 * list with three unknown ids has three things wrong with it and
 * fixing them one throw at a time is three mounts. {@link
 * assertActions} throws the FIRST, because that is what a component
 * mount can do with the reading — decision 3's "refused at mount",
 * the way `./registry.ts`'s `controlKindFor` refuses a type with no
 * row.
 *
 * The pair is also what keeps the walk testable without a
 * `try`/`catch`: the cases below read the list, and one of them
 * reads the throw.
 *
 * ## Mutation note — what the colocated cases actually catch
 *
 * A green suite is not evidence a case can fail, so each claim was
 * measured by breaking it. SIX legs, each read through
 * `bun x vitest run src/dynamic-form/actions.test.ts
 * --reporter=json` — which names the CASES where the default
 * reporter names only failing FILES — and each restoring this file
 * byte-identical afterward (`shasum -a 256 -c`). The counts are of
 * named failing cases out of THREE, and their union is all three,
 * so no case here sits under nothing. Their red counts, in the
 * order below: 1, 1, 1, 1, 3 and 1.
 *
 * - The container branch dropped, so the walk reads top-level defs
 *   only, reds ONE: the nested case, whose ref sits under a list of
 *   objects and is the only ref here that is not top-level.
 * - {@link assertActions} made to return rather than throw reds
 *   ONE, the refusal case, and NOT the nested case — which is what
 *   says those two are asking different questions rather than one
 *   twice.
 * - The message dropping the id it names reds ONE, the refusal
 *   case, and dropping the KEY instead reds the same one. Two legs
 *   rather than one, and the reason that case asserts the halves
 *   separately: a sentence keeping either half alone still matches
 *   a single assertion made over the whole of it.
 * - The membership test inverted, so a ref the table DOES hold is
 *   reported, reds THREE — every case in the file, the one over a
 *   def list naming no action included, because that case carries
 *   a control asking the empty table about a def list that DOES
 *   name one. Without that control it would have stayed green
 *   here, reading exactly as it does now.
 * - `Object.hasOwn` replaced by an `in` test reds ONE, the refusal
 *   case, whose missing id is spelled `toString` for exactly that
 *   reason: every other id in this file is absent from
 *   `Object.prototype` too, so no other case can tell the two
 *   tests apart.
 */

import type { LeafValue } from './FieldControl';
import type { FieldDef, LeafFieldDef } from './fieldDef';
import type { NodePath } from './nodePath';

import { isContainerField } from './fieldDef';

/**
 * What an action is handed when an operator presses its button.
 *
 * Three members and no setter: an action READS where it was pressed
 * and answers a value, which is the whole of decision 4's contract
 * — see the header. It is handed no way to write, so the write
 * stays on the one path `./values.ts` owns.
 */
export interface FieldActionContext {
  /**
   * Where the field sits, absolute from the tree's root.
   *
   * The same path the control reports a keystroke at, so an action
   * that needs to know which item of a list it was pressed in can
   * read it off the segments rather than being told separately.
   */
  readonly path: NodePath;
  /**
   * The def of the field the action belongs to.
   *
   * A {@link LeafFieldDef} and never a {@link FieldDef}, which is
   * decision 5 written into the signature: a container carries no
   * action, so no action can be handed one.
   */
  readonly def: LeafFieldDef;
  /**
   * What is held at {@link FieldActionContext.path} now.
   *
   * `undefined` for a member the draft does not hold, which is
   * `./values.ts`'s spelling for absent — never `null`, which is a
   * value a cleared box answers.
   */
  readonly value: LeafValue | undefined;
}

/**
 * One handler, as a caller supplies it.
 *
 * Decision 4, and the header states the contract in full: a value
 * REPLACES what the field holds, `undefined` changes nothing, and a
 * rejection is shown in the field's error slot rather than thrown.
 * Synchronous or not is the handler's business — a caller that
 * answers a value with no await costs the form no render.
 *
 * @param ctx - Where the action was pressed, and what is there.
 * @returns The value to write, or nothing, now or later.
 */
export type FieldAction = (
  ctx: FieldActionContext,
) => LeafValue | undefined | Promise<LeafValue | undefined>;

/**
 * The table a caller supplies: one handler per id.
 *
 * `Readonly` and indexed by the id a def names. It is a plain
 * `Record` rather than a `Map` because it is written as a literal
 * beside the def list it serves; the header says what "holds an
 * id" means over such an object.
 */
export type FieldActionTable = Readonly<Record<string, FieldAction>>;

/**
 * A def naming an action nothing answers.
 *
 * The def's own `key` and the id it named — see the header for why
 * a key rather than a path. Both are carried so a caller can print
 * them together, which {@link assertActions} is the one reading of.
 */
export interface MissingAction {
  /** The `key` of the def carrying the ref. */
  readonly key: string;
  /** The id it named, which the table does not hold. */
  readonly id: string;
}

/**
 * Every ref one def and its descendants name that the table lacks.
 *
 * The recursion {@link resolveActions} is a fold over. Split out so
 * the exported function reads as the walk over a LIST and this one
 * as the reading of a single def, which is also what keeps the
 * container branch to one place.
 *
 * @param def - Any def, container or leaf.
 * @param table - The handlers the caller supplied.
 * @returns The refs nothing answers, depth first.
 */
function missingUnder(
  def: FieldDef,
  table: FieldActionTable,
): readonly MissingAction[] {
  if (isContainerField(def)) {
    // The two container shapes, through the guard's narrowing
    // rather than an `item ?? fields` read: a list holds ONE def
    // and an object holds a named set, and `./fieldDef.ts`'s union
    // is what hands each over with no cast.
    return def.type === 'list'
      ? missingUnder(def.item, table)
      : def.fields.flatMap((field) => missingUnder(field, table));
  }

  const { action } = def;

  if (action === undefined) {
    return [];
  }

  // `Object.hasOwn` rather than `in` or a `!== undefined` read on
  // the index — see the header on the ids `Object.prototype`
  // answers for.
  if (Object.hasOwn(table, action.id)) {
    return [];
  }

  return [{ key: def.key, id: action.id }];
}

/**
 * Which refs in a def tree the action table does not hold.
 *
 * Walks every def, including the item def of a list and the fields
 * of an object, and answers one {@link MissingAction} per leaf ref
 * nothing in `table` answers. An empty answer is the whole claim a
 * caller wants: every id this def list names is held.
 *
 * Reads no value and writes nothing — a def list is a declaration,
 * and this answers a NEW array over it, never a mutation of either
 * argument.
 *
 * @param defs - The def list the form was handed.
 * @param table - The handlers the caller supplied; `{}` is legal
 * and is correct for a def list naming no action.
 * @returns The unanswered refs, depth first, or an empty list.
 * @throws If a def carries a type outside `FieldType`, which
 * `isContainerField` refuses on this walk's behalf.
 */
export function resolveActions(
  defs: readonly FieldDef[],
  table: FieldActionTable,
): readonly MissingAction[] {
  return defs.flatMap((def) => missingUnder(def, table));
}

/**
 * Refuse a def list naming an action the table does not hold.
 *
 * Decision 3: the form throws at mount, with the def's key and the
 * missing id, rather than drawing a button that does nothing. The
 * FIRST unanswered ref is what the message names — see the header
 * on why the list is answered whole and the throw is not.
 *
 * @param defs - The def list the form was handed.
 * @param table - The handlers the caller supplied.
 * @returns Nothing; it is called for the throw.
 * @throws If any ref is unanswered, naming the first one's def key
 * and the id it named.
 */
export function assertActions(
  defs: readonly FieldDef[],
  table: FieldActionTable,
): void {
  const [missing] = resolveActions(defs, table);

  if (missing === undefined) {
    return;
  }

  throw new Error(
    `No action for field ${missing.key}: unknown id ${missing.id}`,
  );
}
