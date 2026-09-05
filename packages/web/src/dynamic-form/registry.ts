/**
 * @packageDocumentation
 * Which control draws which type: the source doc's type table,
 * written as a total map from the six field types onto the five
 * control kinds this app draws them with.
 *
 * `./fieldDef.ts` says what a field IS and `./readers.ts` says how
 * the text in one box becomes a value. This is the third reading of
 * the same discriminant, and the one that decides what an operator
 * SEES. It draws nothing itself: `./FieldControl.tsx` is where a
 * kind becomes a component, and no test in this package can reach
 * that file, which is the whole reason the choice lives here.
 *
 * It stays app-local rather than following the tree and the
 * breadcrumb into `@ar/ui`, as the v1 spec rules. A library
 * component knows how to draw a box; which box a `datetime`
 * deserves is a decision about this app's own data.
 *
 * ## The kinds are this app's vocabulary, not a component roster
 *
 * A kind is named for what the control IS, never for the `@ar/ui`
 * export that happens to draw it today. `TextInput` draws three of
 * these five, and a date picker built later would take `timestamp`
 * off it without one line here moving. Spelling a kind `switch`
 * would make this table a claim about another package's export
 * list, and that coupling is exactly what keeps a registry out of a
 * component library.
 *
 * ## Four leaf kinds, though three of them draw the same box
 *
 * `string`, `number` and `datetime` are all a `TextInput`, and they
 * are still three kinds, because a kind selects a READER as well as
 * a box: `readStringField` accepts any text where
 * `readDatetimeField` refuses everything that is not an ISO stamp
 * carrying a zone, and `readNumberField` guards twice over what
 * `Number` will cheerfully convert. Collapsing them would leave
 * `./FieldControl.tsx` switching on `def.type` a second time to
 * pick the reader, which is the job this table exists to do once.
 *
 * `number` also carries a requirement of its own that the box does
 * not: the source doc's table asks for direct manual text entry, so
 * it is a text box rather than a stepper and no spinner is ever
 * forced on a large value.
 *
 * ## One kind for both containers
 *
 * `list` and `object` share `drill-in` because the row really is
 * one row. It reports a PATH rather than a value, and everything
 * that differs between the two — how many items there are, what
 * the row says — is a reading of the def rather than of the kind.
 * The two-column decision is what makes that true: a container is
 * never drawn inline, so there is nothing left for a second
 * container kind to vary.
 *
 * ## A table rather than a switch
 *
 * `Readonly<Record<FieldType, FieldControlKind>>` is the addition
 * direction on its own: a seventh member of {@link FieldType} is a
 * key the compiler DEMANDS here, and the mutation note below
 * measures that rather than asserting it. A switch with a `never`
 * default would report the same fault, and carrying both would be
 * two guards over one property — the shape where either can be
 * deleted with every case still green. So the table is the whole
 * compile-time reading, and `./fieldDef.ts` keeps the `never`
 * default its guards need for their own job.
 *
 * The direction the table cannot guard is a type REMOVED from the
 * union, which reddens instead at the typed roster in
 * `./registry.test.ts`. Neither artifact covers both directions,
 * and the same pair guards {@link FieldControlKind}: the union's
 * own declaration says nothing about a kind added and mapped to no
 * type, which is a control nothing ever draws, and only the case
 * crossing that roster against this table reports it.
 *
 * ## Why {@link controlKindFor} still throws
 *
 * That is a DIFFERENT fault from the one the table's type reports,
 * and neither covers the other. The annotation catches a type added
 * to the union with no row. The throw catches a type from OUTSIDE
 * the union entirely — a def parsed out of a payload, or built by
 * a generator that does not type-check — which the table answers
 * `undefined` for. Returning that would leave the member off the
 * form with nothing reported anywhere, which is the quietest way a
 * form can lose a field.
 *
 * ## No `??` fallback, deliberately
 *
 * `noUncheckedIndexedAccess` is on repo-wide and does NOT reach
 * this table: a `Record` over a union of string literals is a
 * mapped type with literal keys rather than an index signature, so
 * `CONTROL_KIND_BY_TYPE[type]` reads as a `FieldControlKind` and
 * never as a `FieldControlKind | undefined`. The reflex repair for
 * the `undefined` the reader guards against is therefore a
 * `?? 'text'` no compiler ever asked for, and it would swallow the
 * very error that reports a type with no row. The reader widens one
 * local annotation instead, which admits the runtime case without
 * loosening the table.
 *
 * ## Mutation note
 *
 * Measured rather than argued, over `./registry.test.ts` at 10
 * cases. Each compile-time leg was read through `bun run
 * check-types` from inside `packages/web`, which answers EXIT 2 for
 * a type error and never 1; each runtime leg through
 * `--reporter=json`, which names the CASES where the default
 * reporter names only failing FILES. Every leg restored both files
 * it touched byte-identical.
 *
 * The four compile-time legs are the totality claims above:
 *
 * - A seventh member added to {@link FieldType} reds THREE errors,
 *   one of them TS2741 here, naming `currency` as a property this
 *   table is missing. The other two are `./fieldDef.ts`'s own pair.
 *   That count is a snapshot rather than a property: it grows by
 *   one with every module that keys a table by {@link FieldType},
 *   and this table is what moved it from two to three.
 * - `datetime` REMOVED from {@link FieldType} reds TS2353 here, at
 *   the row that outlived it, and TS2322 at the type roster in
 *   `./registry.test.ts`.
 * - `timestamp` removed from {@link LeafControlKind} reds TS2322 at
 *   the `datetime` row here and TS2353 at that file's kind roster.
 * - A sixth kind ADDED reds ONE error, TS2741 at the kind roster
 *   and NOWHERE in this module — which is the whole reason that
 *   roster is a record rather than an array.
 *
 * The five runtime legs red 10 of 10 cases between them, so no
 * case sits under nothing. That is read as a UNION over the case
 * roster parsed out of the test file, never leg by leg: a grid
 * read one leg at a time looks complete while individual cases sit
 * under nothing. Their red counts, in the order below: 4, 1, 4, 6
 * and 3.
 *
 * - {@link controlKindFor} returning one constant kind reds FOUR,
 *   and NOT the case pinning the table row by row. A reader that
 *   stopped reading its table is invisible to every assertion made
 *   about the table, which is why one case compares the two reads.
 * - Dropping the `undefined` guard reds exactly ONE case, the one
 *   asking what a type from outside the union does. It is not the
 *   only leg reaching that case — the re-key below reds it too,
 *   by answering a kind where the throw belongs — but it is the
 *   only one reaching it without also moving the table.
 * - This registry re-keyed `Readonly<Record<string,
 *   FieldControlKind>>` with a foreign row added — the reflex
 *   repair for that throw — is the ONLY leg reaching the case
 *   that reads `undefined` off the table, which is what that case
 *   is for.
 * - The `datetime` row's VALUE set to `undefined` reds six, and is
 *   the only leg reaching the case that reads all six types back
 *   defined. It leaves the KEY in place, so the case counting keys
 *   stays GREEN under it — which is what says those two cases
 *   are asking different questions rather than one twice.
 * - `object` drawn as a leaf box is the only leg reaching the case
 *   pinning both containers to one kind, and it reds the row-level
 *   case beside it.
 */

import type { FieldType } from './fieldDef';

/**
 * The control kinds the four leaf types draw as.
 *
 * One per leaf type rather than one per box, for the reason the
 * header gives: a kind picks the reader too, and three of these
 * four are the same box today.
 */
export type LeafControlKind =
  | 'text'
  | 'toggle'
  | 'numeric'
  | 'timestamp';

/**
 * The one kind both container types draw as.
 *
 * A union of one, named rather than inlined, because "both
 * containers are the same row" is a claim and this is where it is
 * written down.
 */
export type ContainerControlKind = 'drill-in';

/** Every kind `./FieldControl.tsx` switches over. */
export type FieldControlKind = LeafControlKind | ContainerControlKind;

/**
 * The table's shape: total over the six types, and read-only.
 *
 * Named rather than written inline below, so the annotation
 * carrying the totality claim reads as one thing.
 */
type ControlKindTable = Readonly<Record<FieldType, FieldControlKind>>;

/**
 * The registry: which control kind draws each of the six types.
 *
 * The source doc's type table and nothing beyond it. Reach it
 * through {@link controlKindFor} wherever the type came from
 * outside this app — see the header for what an index alone
 * answers there.
 */
export const CONTROL_KIND_BY_TYPE: ControlKindTable = {
  string: 'text',
  boolean: 'toggle',
  number: 'numeric',
  datetime: 'timestamp',
  list: 'drill-in',
  object: 'drill-in',
};

/**
 * Which control kind draws a field of this type.
 *
 * @param type - The type read off a def.
 * @returns The one kind {@link CONTROL_KIND_BY_TYPE} names for it.
 * @throws If the type is outside {@link FieldType}, which
 * `check-types` rules out for every def written in this app.
 */
export function controlKindFor(type: FieldType): FieldControlKind {
  // Annotated wider than the table's own value type on purpose. The
  // lookup is a `FieldControlKind` to the compiler, the table's keys
  // being literals, and `undefined` is exactly what a type from
  // outside the union produces at runtime. Widening one local is
  // what makes the guard below legal without loosening the table.
  const kind: FieldControlKind | undefined
    = CONTROL_KIND_BY_TYPE[type];

  if (kind === undefined) {
    throw new Error(`No control for field type: ${String(type)}`);
  }

  return kind;
}
