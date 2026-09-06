/**
 * @packageDocumentation
 * The contract the dynamic form renders from: what a field IS, before
 * anything has decided how to draw it.
 *
 * `.specs/q17-dynamic-form-provider.md` is the authority for the six
 * types and for the members every def carries. This module is that
 * table written as types and nothing else — no control, no value, no
 * refusal. `./registry.ts` maps a type to a control and
 * `./readers.ts` reads what an operator typed; both are readings OF
 * this contract rather than parts of it.
 *
 * It is a `.ts` for the reason the whole core of `src/dynamic-form/`
 * is: the unit runner collects `.ts` files under `src` in a node
 * environment, so a decision living in a `.tsx` is reachable by no
 * test in this package at all.
 *
 * ## Discriminated on `type`, not one interface with optional members
 *
 * The alternative is a single `FieldDef` carrying `item?` and
 * `fields?`, and it loses in both of the places this provider spends
 * its time.
 *
 * It makes `{ type: 'object' }` with no fields REPRESENTABLE, and
 * there is nothing an object with no properties can draw.
 * Discriminated, that literal is a `check-types` error where somebody
 * wrote it rather than an empty form on somebody else's screen.
 *
 * And it takes the exhaustiveness away from the compiler. A
 * seventh member of {@link FieldType} reddens every switch holding
 * no case for it, and it is also a key `./registry.ts`'s table
 * DEMANDS — which is what turns growing the contract into a build
 * failure rather than a default branch quietly drawing the new type
 * as text. The mutation note below measures both rather than
 * asserting them.
 *
 * Narrowing is the third thing that falls out and the one every walk
 * leans on: `def.type === 'list'` hands over the item def with no
 * cast and no runtime "does this one have an item" check.
 *
 * ## `item` and `fields` COMPLETE the contract; they do not extend it
 *
 * The source doc declares four members — `key`, `label`, `type` and
 * an optional `description` — over six types, and two of those six
 * cannot be rendered from the four. Its own type table says a `list`
 * is a "list of form components of the item type" and an `object` is
 * "a nested dynamic form of the property types"; neither the item
 * type nor the property types have anywhere to live in those four
 * members. So {@link ListFieldDef.item} and
 * {@link ObjectFieldDef.fields} are that table's existing requirement
 * written down, not a fifth and sixth member somebody wanted.
 *
 * They are also not the line that doc draws at v2, which is over
 * CONSTRAINTS: bounds, ranges, enumerations, and the composite types
 * built on them. Nothing here bounds a value, refuses one, or says
 * anything about what a value may BE — `fields` says what an object
 * HAS, never what any of it must satisfy. Validation stays where it
 * already is, at the save path's schema, whose refusals
 * `../components/jsonDraft.ts` turns into sentences. A second rule
 * source here would give one question two answers free to drift.
 *
 * ## Which array stance this module is in
 *
 * `readonly`, the opposite of the stance
 * `../components/jsonDraft.ts` takes and for the opposite reason: a
 * def list is a DECLARATION this app owns and walks, never a prop
 * handed to an `@ar/ui` component whose own signature declares it
 * mutable.
 *
 * ## Mutation note — the fabricated seventh type
 *
 * Measured rather than argued, with a fabricated `'currency'` added
 * to {@link LeafFieldType} and every case and every table left as it
 * stands. `bun run check-types` from inside `packages/web` answers
 * EXIT 2 — tsc's code for a type error, never 1 — with three
 * errors, every one naming the fabricated member:
 *
 * - TS2345 at {@link isContainerField}'s default branch, where the
 *   discriminant it hands on is no longer `never`.
 * - TS2741 in `./fieldDef.test.ts`, whose def table is keyed by
 *   {@link FieldType} and so is short a key.
 * - TS2741 in `./registry.ts`, whose control table is keyed the
 *   same way and short the same key.
 *
 * Restoring the member leaves all three green and this file
 * byte-identical.
 *
 * THREE is a snapshot rather than a property of the union: the
 * count is one per module keying a table by {@link FieldType}, so a
 * later module adding one moves it again. Re-derive it rather than
 * holding a run against the number here — what the mutation
 * claims is that every such table is short a key, not that there
 * are three of them.
 *
 * That PAIR is the whole of this module's exhaustiveness claim, and
 * the opposite direction is a DIFFERENT mutation: removing
 * `'datetime'` from the union reddens {@link LEAF_FIELD_TYPES}'s
 * literal (TS2322) and the switch case still naming it (TS2678).
 * Neither artifact covers both directions on its own.
 */

/**
 * The four types whose value is one editable box.
 *
 * "Leaf" is a statement about the tree `./tree.ts` builds rather than
 * about the value: these are the types that become a field in the one
 * mounted form, and never a node to drill into.
 */
export type LeafFieldType =
  | 'string'
  | 'boolean'
  | 'number'
  | 'datetime';

/**
 * The two types that hold other fields.
 *
 * A `list` holds one repeated shape and an `object` holds a named
 * set. That is the whole distinction the source doc's nesting
 * strategy turns into the drill-in, and neither draws its members
 * inline.
 */
export type ContainerFieldType = 'list' | 'object';

/** The six types v1 renders, as the source doc's table lists them. */
export type FieldType = LeafFieldType | ContainerFieldType;

/**
 * The members every def carries, whatever its type.
 *
 * Exactly the source doc's four, minus the discriminant each member
 * of the union declares for itself. Unexported deliberately: a def is
 * one of the three below, and a value typed as this base alone would
 * be one no control renders.
 */
interface FieldDefBase {
  /** The key this field reads and writes in the data structure. */
  readonly key: string;
  /** What the field is called on screen. */
  readonly label: string;
  /**
   * An optional clarification, for the human AND for an agent.
   *
   * A constraint or clarification of the TYPE, as the source doc's
   * metadata contract defines it — never an enrichment of one record.
   */
  readonly description?: string;
}

/**
 * A field whose value is one editable box.
 *
 * One interface for all four types rather than four, because nothing
 * about the DEF varies between them: which control draws it is
 * `./registry.ts`'s reading of the same discriminant, and how its
 * text becomes a value is `./readers.ts`'s.
 */
export interface LeafFieldDef extends FieldDefBase {
  /** Which of the four leaf types this field is. */
  readonly type: LeafFieldType;
}

/** A list of one repeated shape, drilled into rather than inlined. */
export interface ListFieldDef extends FieldDefBase {
  /** The discriminant, fixed so a narrowing reaches {@link item}. */
  readonly type: 'list';
  /**
   * The shape every item takes.
   *
   * ONE def rather than a list of them: a list is homogeneous by
   * construction here, and a per-index shape is what would make an
   * item's form depend on where it sits. `./tree.ts` derives an
   * item's label from this def's own `label` and its position, which
   * is why the contract grows no per-item label member.
   */
  readonly item: FieldDef;
}

/** An object holding a named set of fields, drilled into likewise. */
export interface ObjectFieldDef extends FieldDefBase {
  /** The discriminant, fixed so a narrowing reaches {@link fields}. */
  readonly type: 'object';
  /**
   * The properties this object holds, in the order to draw them.
   *
   * Required rather than optional, which is the representability the
   * header argues for: an object with nothing in it has no form.
   * `FieldDef` rather than a leaf-only list, because the source doc's
   * nesting strategy expects a list of objects and an object holding
   * an object, and the drill-in is what serves both.
   */
  readonly fields: readonly FieldDef[];
}

/** A def that holds other defs: the two the tree drills into. */
export type ContainerFieldDef = ListFieldDef | ObjectFieldDef;

/** One field, as the renderer and every pure walk read it. */
export type FieldDef = LeafFieldDef | ContainerFieldDef;

/**
 * The leaf types, in the order the source doc's table lists them.
 *
 * Annotated `readonly LeafFieldType[]` rather than left to inference,
 * which is the one direction it guards: a type REMOVED from the union
 * reddens at the literal here that still names it (TS2322, measured).
 * It says nothing about a type ADDED — see the header's mutation note
 * for the pair that covers the other direction.
 */
export const LEAF_FIELD_TYPES: readonly LeafFieldType[] = [
  'string',
  'boolean',
  'number',
  'datetime',
];

/**
 * The branch a total switch over {@link FieldType} has nothing left
 * for.
 *
 * The parameter is `never` while the union holds exactly the six, so
 * a seventh reddens the CALL rather than reaching the throw. That is
 * the exhaustiveness the header's mutation note measures.
 *
 * It still throws, because the compiler's guarantee stops at this
 * app's boundary: a def read out of a payload, or built by a
 * generator that does not type-check, can carry a type no case
 * claims. Answering "leaf" for it would draw a container as a text
 * box and report nothing at all.
 *
 * @param type - The type no case above claimed.
 * @returns Never; the call does not return.
 * @throws Always, naming the type that reached it.
 */
function unreachableFieldType(type: never): never {
  throw new Error(`Unknown field type: ${String(type)}`);
}

/**
 * Whether a def holds other defs, and so is a node to drill into.
 *
 * A switch rather than a `!== 'list' && !== 'object'` pair, for the
 * one thing only the switch gives: the default branch's `never` makes
 * a seventh member of {@link FieldType} a compile error HERE, where
 * the pair would quietly answer `false` and send it to a leaf
 * control.
 *
 * @param def - Any def.
 * @returns Whether it is a `list` or an `object`.
 * @throws If the def carries a type outside {@link FieldType}, which
 * `check-types` rules out for every def written in this app.
 */
export function isContainerField(
  def: FieldDef,
): def is ContainerFieldDef {
  // Switched on the DESTRUCTURED discriminant rather than on
  // `def.type`, which is what leaves the default branch a value to
  // name: narrowing `def` to `never` takes its members with it, and
  // `def.type` there is an error about the wrong thing (TS2339,
  // measured) instead of the TS2345 that reports a seventh type.
  const { type } = def;

  switch (type) {
    case 'list':
    case 'object':
      return true;
    case 'string':
    case 'boolean':
    case 'number':
    case 'datetime':
      return false;
    default:
      return unreachableFieldType(type);
  }
}

/**
 * Whether a def is one editable box rather than a node.
 *
 * The negation of {@link isContainerField} rather than a second
 * switch, so the two cannot drift: this module holds ONE total
 * reading of the discriminant and this is its other side. The types
 * it answers `true` for are exactly {@link LEAF_FIELD_TYPES}, which
 * `./fieldDef.test.ts` crosses against the union rather than leaving
 * the roster to be believed.
 *
 * @param def - Any def.
 * @returns Whether it is one of the four leaf types.
 * @throws If the def carries a type outside {@link FieldType}, for
 * the reason {@link isContainerField} gives.
 */
export function isLeafField(def: FieldDef): def is LeafFieldDef {
  return !isContainerField(def);
}
