/**
 * @packageDocumentation
 * The contract the dynamic form renders from: what a field IS, before
 * anything has decided how to draw it.
 *
 * `.specs/q17-dynamic-form-provider.md` is the authority for the six
 * types v1 shipped with and for the members every def carries, and
 * `.specs/q20b-0-dynamic-form-enum-and-actions.md` for the seventh,
 * `enum`, and for the ACTION a leaf def may name. This module is
 * that table written as types and nothing else — no control, no
 * value, no refusal. `./registry.ts` maps a type to a control and
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
 * And it takes the exhaustiveness away from the compiler. An
 * eighth member of {@link FieldType} reddens every switch holding
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
 * {@link EnumFieldDef.options} is the third member of that kind and
 * the only one that does not come off the source doc at all: that
 * doc defers enumerations to a v2 it draws over CONSTRAINTS —
 * bounds, ranges, enumerations, and the composite types built on
 * them — and `.specs/q20b-0-dynamic-form-enum-and-actions.md` takes
 * the enumeration out of that list and nothing else with it. A
 * select cannot be drawn without the positions it offers, which is
 * the same completeness argument the two above make.
 *
 * What none of the three is, is a rule a value is CHECKED against.
 * `fields` says what an object HAS and `options` says what a select
 * OFFERS; the membership `./readers.ts`'s `readEnumField` applies is
 * that control reading its own positions, and nothing here bounds a
 * number, ranges a stamp or refuses a string. Validation stays where
 * it already is, at the save path's schema, whose refusals
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
 * ## The leaf side is a union too, and for the same reason
 *
 * Four of the five leaf types carry the leaf base and nothing more,
 * and `enum` carries {@link EnumFieldDef.options}. So
 * {@link LeafFieldDef} is {@link PlainLeafFieldDef} beside
 * {@link EnumFieldDef} rather than one interface over all five with
 * an optional `options?`, which is the representability argument at
 * the top of this header applied one level down: optional, an
 * `{ type: 'enum' }` carrying no options is WRITEABLE, and a select
 * with no positions is exactly the thing the tuple exists to rule
 * out. `./fieldDef.test.ts` pins the empty literal as a type error.
 *
 * {@link PlainLeafFieldDef.type} is `Exclude<LeafFieldType, 'enum'>`
 * rather than the four spelled again, which is what keeps a sixth
 * leaf type a ONE-line edit to {@link LeafFieldType}: it lands in
 * that interface by subtraction, and the mutation note below is the
 * reading of what it reddens everywhere else.
 *
 * ## An action is a REF, and the handler is the caller's
 *
 * {@link FieldActionRef} carries an id and a label and no function,
 * which is decision 2 of
 * `.specs/q20b-0-dynamic-form-enum-and-actions.md` and the one thing
 * that keeps a def what the rest of this header assumes it is: a
 * value, JSON-serialisable, readable out of a payload and pinnable
 * by the unit runner. A handler ON the def takes all three away at
 * once, and a slot component per field would be a second registry
 * beside `./registry.ts`; both were considered there and closed.
 *
 * So the id is opaque HERE. Nothing in this module, and nothing in
 * this package, knows what an action DOES — `./actions.ts` is where
 * an id is matched against the table a caller supplies, and where
 * the refusal for an id nothing answers is written. This module
 * declares that a leaf may name one, and stops.
 *
 * ## Only a LEAF may carry one, and that is a type error
 *
 * Decision 5 defers actions on containers to v2, and the contract
 * says so structurally rather than in prose: `action` sits on
 * {@link LeafFieldDefBase}, which {@link PlainLeafFieldDef} and
 * {@link EnumFieldDef} extend and the two container defs do not.
 * `./fieldDef.test.ts` pins both halves of that — a list def and an
 * object def carrying `action` are each a `check-types` error where
 * somebody wrote them, and a leaf def carrying the same member
 * compiles beside them with no directive at all.
 *
 * A third leaf-only member is also why that base exists rather than
 * the member being spelled twice: two spellings of one optional
 * member are two things to keep in step, and the union's whole
 * point is that the compiler keeps them instead.
 *
 * Measured in both directions. A literal carrying `action` answers
 * TS2353 at the `action` line itself — `'action' does not exist in
 * type 'ListFieldDef'`, and the same for `ObjectFieldDef` — under
 * `satisfies ListFieldDef`, under `satisfies ContainerFieldDef` and
 * under a plain `: FieldDef` annotation alike, the discriminant
 * being enough to pick the constituent before the excess member is
 * read. The opposite leg is what says the pin can fail: `action`
 * moved onto {@link FieldDefBase} makes both `@ts-expect-error`
 * directives in `./fieldDef.test.ts` TS2578, `Unused
 * '@ts-expect-error' directive`, one per container.
 *
 * ## Mutation note — the fabricated eighth type
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
 * This is the reading RE-TAKEN after `enum` joined the union and
 * again after {@link FieldActionRef} did, and the count did not
 * move at either: the three are the same three the seventh type
 * reddened, the only difference being that each printed type now
 * carries the `enum` key beside the rest. The action ref adds no
 * site of its own because neither it nor
 * {@link LeafFieldDefBase} keys a table by {@link FieldType}. `'currency'` lands in
 * {@link PlainLeafFieldDef} by the `Exclude` above with no error of
 * its own, so the leaf union's split adds no fourth site — and
 * nothing reddens in `./LeafControl.tsx`, whose switch is over the
 * KIND rather than the type.
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
 * The five types whose value is one control an operator edits here.
 *
 * "Leaf" is a statement about the tree `./tree.ts` builds rather than
 * about the value: these are the types that become a field in the one
 * mounted form, and never a node to drill into. Four of them are a
 * box and `enum` is a select, which is `./registry.ts`'s distinction
 * to make rather than this union's.
 */
export type LeafFieldType =
  | 'string'
  | 'boolean'
  | 'number'
  | 'datetime'
  | 'enum';

/**
 * The two types that hold other fields.
 *
 * A `list` holds one repeated shape and an `object` holds a named
 * set. That is the whole distinction the source doc's nesting
 * strategy turns into the drill-in, and neither draws its members
 * inline.
 */
export type ContainerFieldType = 'list' | 'object';

/**
 * The seven types this app renders: the source doc's table, and the
 * `enum` `.specs/q20b-0-dynamic-form-enum-and-actions.md` adds to it.
 */
export type FieldType = LeafFieldType | ContainerFieldType;

/**
 * The members every def carries, whatever its type.
 *
 * Exactly the source doc's four, minus the discriminant each member
 * of the union declares for itself. Unexported deliberately: a def is
 * one of the four members of {@link FieldDef} below, and a value
 * typed as this base alone would be one no control renders.
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
 * A leaf def's reference to an action a caller supplies.
 *
 * Two members and neither is a function — see the header for why
 * that is the contract rather than a convenience. {@link id} is
 * looked up in the table `./actions.ts` checks a def list against;
 * {@link label} is this def's own and is never read from there.
 */
export interface FieldActionRef {
  /**
   * The key of the handler in the caller's action table.
   *
   * Opaque to this package: it is matched, never interpreted. An id
   * the table does not hold is what `./actions.ts` refuses, naming
   * this def's `key` beside it.
   */
  readonly id: string;
  /**
   * What the action is called on screen.
   *
   * Carried on the DEF rather than on the handler, so a def list
   * reads whole — the label is part of what the form draws, and a
   * caller swapping one handler for another changes no wording. It
   * is also the button's accessible name, which is the one thing
   * that makes the control reachable without sight of the icon.
   */
  readonly label: string;
}

/**
 * What the two leaf defs share beyond {@link FieldDefBase}.
 *
 * Exactly {@link LeafFieldDefBase.action}, and unexported for the
 * reason {@link FieldDefBase} is: a value typed as this base alone
 * names no type, so no control draws it. A leaf def is one of the
 * two members of {@link LeafFieldDef}.
 */
interface LeafFieldDefBase extends FieldDefBase {
  /**
   * The action drawn beside this field's control, if it has one.
   *
   * Optional, and absent on almost every def: an action is a button
   * an operator presses to FILL the box, not a property of being a
   * field. Container defs cannot carry it at all — the header's
   * section on that is the ruling, and `./fieldDef.test.ts` the
   * measurement.
   *
   * What pressing it does is no part of this contract. The handler,
   * the value it answers and the refusal it can fail with all live
   * with the caller, behind `./actions.ts`'s `FieldAction`.
   */
  readonly action?: FieldActionRef;
}

/**
 * A field whose value is one editable box.
 *
 * One interface for all four of those types rather than four,
 * because nothing about the DEF varies between them: which control
 * draws it is `./registry.ts`'s reading of the same discriminant,
 * and how its text becomes a value is `./readers.ts`'s.
 *
 * {@link EnumFieldDef} is the fifth leaf type and is NOT this
 * interface, carrying a member of its own — see the header.
 */
export interface PlainLeafFieldDef extends LeafFieldDefBase {
  /** Which leaf type this field is, `enum` excepted. */
  readonly type: Exclude<LeafFieldType, 'enum'>;
}

/**
 * One choice a select offers: what is stored, and what is shown.
 *
 * Two members rather than a bare string, because the two questions
 * differ and a shared spelling answers neither well: `value` is what
 * the payload carries and what `./readers.ts` matches text against,
 * and `label` is prose an operator reads. A record saved under a
 * relabelled option keeps its value, which is what makes the label
 * safe to reword.
 */
export interface EnumOption {
  /** What the form writes, and the only spelling a reader accepts. */
  readonly value: string;
  /** What the option is called on screen. */
  readonly label: string;
}

/**
 * A field whose value is one of a fixed, declared set.
 *
 * The one leaf def carrying a member of its own, which is why
 * {@link LeafFieldDef} is a union rather than an interface. It draws
 * as `./registry.ts`'s `choice` kind and reads through
 * `./readers.ts`'s `readEnumField`, which takes this type rather
 * than a {@link FieldDef} because {@link options} is the whole of
 * what it matches against.
 */
export interface EnumFieldDef extends LeafFieldDefBase {
  /** The discriminant, fixed so a narrowing reaches {@link options}. */
  readonly type: 'enum';
  /**
   * The choices this field offers, in the order to draw them.
   *
   * A non-empty tuple rather than `readonly EnumOption[]`, which is
   * the same representability argument {@link ObjectFieldDef.fields}
   * makes below: there is nothing a select with no options can draw,
   * and an empty literal here is a `check-types` error where
   * somebody wrote it rather than an empty dropdown on somebody
   * else's screen. Measured, with a probe carrying `options: []`:
   * `bun run check-types` answers EXIT 2 and one TS2322, `Type '[]'
   * is not assignable to type 'readonly [EnumOption,
   * ...EnumOption[]]'`.
   *
   * The head is the only position the type distinguishes, and one
   * thing now reads it: `./values.ts`'s `freshEnumValue` answers
   * the first option's `value` for a member holding nothing, which
   * is total for exactly the reason above. So the ORDER of this
   * list is load-bearing at its first entry — a reordered def
   * list changes what an absent member opens at.
   */
  readonly options: readonly [EnumOption, ...EnumOption[]];
}

/**
 * A field that is one control here rather than a node to drill into.
 *
 * The union the header argues for: the four plain types beside the
 * one carrying options. Every walk in this directory reaches it
 * through {@link isLeafField} rather than by reading `type` twice.
 */
export type LeafFieldDef = PlainLeafFieldDef | EnumFieldDef;

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
  'enum',
];

/**
 * The branch a total switch over {@link FieldType} has nothing left
 * for.
 *
 * The parameter is `never` while the union holds exactly the seven,
 * so an eighth reddens the CALL rather than reaching the throw. That
 * is the exhaustiveness the header's mutation note measures.
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
 * an eighth member of {@link FieldType} a compile error HERE, where
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
  // measured) instead of the TS2345 that reports an eighth type.
  const { type } = def;

  switch (type) {
    case 'list':
    case 'object':
      return true;
    case 'string':
    case 'boolean':
    case 'number':
    case 'datetime':
    case 'enum':
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
 * @returns Whether it is one of the five leaf types.
 * @throws If the def carries a type outside {@link FieldType}, for
 * the reason {@link isContainerField} gives.
 */
export function isLeafField(def: FieldDef): def is LeafFieldDef {
  return !isContainerField(def);
}
