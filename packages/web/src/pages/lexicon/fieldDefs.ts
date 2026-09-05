/**
 * @packageDocumentation
 * What the dynamic form draws when the lexicon editor is showing its
 * fields presentation: one term-payload entry, written as the
 * declarations `../../dynamic-form/fieldDef.ts` renders from.
 *
 * Beside `./schema.ts` and for the reason that file gives about
 * itself — the page is what knows the shape it is editing. The defs
 * and the schema are two readings of one declaration, so both are
 * the page's to hand over: `DynamicForm` takes defs as a prop
 * exactly as `../../components/JsonEditor.tsx` takes a schema, and
 * neither component infers anything about the payload it is given.
 *
 * They are readings of the same thing and NOT copies of each other.
 * The schema says what a payload must satisfy; these defs say what
 * an operator is offered and what to call it. Nothing here bounds a
 * value or refuses one — `fieldDef.ts` states at length that
 * constraints are the v2 line and that a second rule source would
 * give one question two answers free to drift.
 *
 * ## Which member forced which answer
 *
 * Four members, from {@link EditableTermMembers} — the ones
 * `./schema.ts` declares an operator may write. Three of the four
 * are decided by the member's own type and the fourth is decided by
 * what v1 does not have.
 *
 * - `pattern` forced `string`. `Term.pattern` is a plain
 *   string and v1's `string` is the one box that draws it. The
 *   schema's non-empty rule has no home here and is not missing one.
 * - `weight` forced `number`. `Term.weight` is a number, and
 *   `../../dynamic-form/readers.ts` reads that box from free TEXT —
 *   refusing what is not finite rather than coercing it, which is
 *   what keeps `Number('')` being `0` out of the draft.
 * - `polarity` forced `string`, and it is the one DEGRADED answer.
 *   See below.
 * - `notes` forced `string`. `Term.notes` is `string | null`
 *   and a cleared leaf box writes `null` by the provider's stated
 *   decision, so the nullable member round-trips losslessly through
 *   the same type its non-nullable neighbour uses. `''` beside
 *   `null` would be the two spellings of one state `./schema.ts`
 *   refuses, and no box here can produce it.
 *
 * No member forced `null`, so the reading below answers the def list
 * and the fields presentation is offered. That is a measurement of
 * this payload and not a property of the provider.
 *
 * ## Why `polarity` is free text in v1
 *
 * Because the six types carry no enumeration. `TermPolarity` has
 * three spellings and v1 has no type that says so — the text-enum
 * toggle list that would is one of the composite types the source
 * doc defers to v2, and inventing one here would be the validation
 * metadata `fieldDef.ts` rules out.
 *
 * So the box is a text box, and the refusal is the SAVE PATH's.
 * `./schema.ts`'s `termPayloadSchema` reads its enum off
 * {@link POLARITY_FACETS}, so an out-of-union spelling is refused by
 * an `invalid_value` issue naming the entry, the member and the
 * values allowed, which `../../components/jsonDraft.ts` turns into a
 * sentence and `DynamicForm` shows in the same banner the JSON box
 * uses. Nothing is accepted that the JSON box would refuse.
 *
 * That makes free text a degradation rather than a hole, and the
 * degradation is worth naming: an operator finds out at the edit
 * rather than at the control. {@link POLARITY_DESCRIPTION} is what
 * this module can do about it — the spellings are listed in the
 * field's own description, derived from the table that owns them, so
 * a polarity added upstream is offered here rather than being a
 * spelling the hint goes on omitting.
 *
 * ## Why the reading can answer `null`
 *
 * `DynamicFormProps.defs` has no way to say "part of this shape is
 * undrawable", and it should not: a form that quietly dropped a
 * member would write a payload the schema refuses at a member nobody
 * edited. So the whole shape is expressible or it is not, and
 * {@link fieldDefsForTermPayload} answers `null` for the second —
 * which is what leaves the JSON box as the fallback, that box being
 * able to express anything the schema takes.
 *
 * The answer is FOLDED from {@link ENTRY_MEMBER_DEFS} rather than
 * written as a branch, so "where the shape allows" is computed from
 * one declaration per member. A member v1 gains no type for is one
 * `null` row, and the presentation stops being offered without
 * anything else in this file moving.
 *
 * ## The table is a parameter, and why
 *
 * The refusal arm is unreachable while all four members are
 * expressible, and a branch nothing can drive is a branch nothing
 * measures. So the table {@link fieldDefsForTermPayload} folds is
 * its parameter, defaulted to this module's own; `./fieldDefs.test.
 * ts` drives the arm with a table holding an inexpressible member.
 * Every caller in the app passes nothing.
 *
 * ## Mutation note — a member that drifts
 *
 * Measured, not argued, against `EditableTermMembers` in
 * `./schema.ts` with everything here left as it stands.
 * `bun run check-types` from inside `packages/web` answers EXIT 2 —
 * tsc's code for a type error, never 1 — for both directions:
 *
 * - A FIFTH member added to that `Pick` (`'id'`) is TS2741 at
 *   {@link ENTRY_MEMBER_DEFS}, naming `id` as the property the table
 *   is missing. TWO more land next door, at both of the tables
 *   `./fieldDefs.test.ts` keys the same way.
 * - `'polarity'` REMOVED from it is two errors HERE, one per
 *   artifact: TS2322 at {@link ENTRY_MEMBER_ORDER}'s literal, whose
 *   spelling outlived the union, and TS2353 at
 *   {@link ENTRY_MEMBER_DEFS}, the row now being an excess property.
 *   Five more land next door, TS2345 among them wherever a case
 *   names the member in a call.
 *
 * Neither artifact reports the other's direction: the record is the
 * addition side and the ordered literal is the removal side. Both
 * spellings restore green and leave this file byte-identical.
 *
 * A THIRD compile-time leg guards the crossing itself. Widening
 * {@link TermEntryMemberDefs} to `Record<string, ...>` is TS2322
 * next door and reddens NO case at all — which is exactly why that
 * crossing is a pair of typed functions rather than an assertion,
 * and why a green suite is no evidence about it.
 *
 * Those codes are the COMPILER's half. The half it cannot make is
 * that a def sitting in the `pattern` row actually WRITES
 * `pattern`: a def's `key` is a plain string, so a misspelling
 * type-checks perfectly and edits a member the payload does not
 * have. Measured — misspelling one key reddens five cases next
 * door and `check-types` none of them. That runtime crossing is the
 * only place the reading exists.
 */

import type { EditableTermMembers } from './schema';
import type {
  LeafFieldDef,
  ListFieldDef,
  ObjectFieldDef,
} from '../../dynamic-form/fieldDef';

import { POLARITY_FACETS } from './cards';

/**
 * One v1 def per member a term payload carries, or `null` for a
 * member v1 has no type for.
 *
 * Keyed by {@link EditableTermMembers} rather than by a union of its
 * own, which is the whole of this module's addition-direction
 * guard: a member added to what an operator may write is a key the
 * compiler demands here, rather than a field the form quietly stops
 * drawing.
 *
 * `null` is a declaration and not an absence — see the header on why
 * one undrawable member refuses the whole shape.
 */
export type TermEntryMemberDefs = Readonly<
  Record<keyof EditableTermMembers, LeafFieldDef | null>
>;

/**
 * The polarity spellings, in the order the surface draws them.
 *
 * Read off {@link POLARITY_FACETS} for the reason `./schema.ts`
 * gives about its own copy: the order and the membership belong to
 * `./cards.ts`, and every reader takes them from the owner instead
 * of from each other. Here it matters twice over, the description
 * being the only place v1 can say what the spellings are.
 */
const POLARITY_NAMES: readonly string[] = POLARITY_FACETS
  .map((facet) => facet.polarity);

/**
 * What the polarity box tells an operator, in place of a control
 * that could constrain it.
 *
 * A bare comma list rather than a phrase: a hint is read at a
 * glance, and the values are what an operator needs to copy.
 */
const POLARITY_DESCRIPTION
  = `Which way a match counts. One of: ${POLARITY_NAMES.join(', ')}.`;

/**
 * The members, in the order the one mounted form draws them.
 *
 * Annotated `readonly (keyof EditableTermMembers)[]`, which is the
 * direction {@link ENTRY_MEMBER_DEFS} cannot guard: a member REMOVED
 * from what an operator may write reddens `check-types` at the
 * spelling here that outlived it.
 *
 * It is also the draw order, which is deliberately not the record's
 * key order: a record has no order a render may rely on, the
 * argument `./cards.ts` makes about its own pair.
 */
const ENTRY_MEMBER_ORDER: readonly (keyof EditableTermMembers)[] = [
  'pattern',
  'weight',
  'polarity',
  'notes',
];

/**
 * What each member of one entry is offered as.
 *
 * Every `key` is the member it writes, which is the claim the
 * compiler cannot make and `./fieldDefs.test.ts` crosses at runtime.
 * The labels are the surface's own words for the four columns the
 * template presentation already draws.
 *
 * The descriptions are the source doc's metadata contract as it
 * applies to a TYPE — a clarification of what the member is, never
 * an enrichment of one row.
 */
const ENTRY_MEMBER_DEFS: TermEntryMemberDefs = {
  pattern: {
    key: 'pattern',
    label: 'Pattern',
    type: 'string',
    description: 'What the row looks for, matched anchored.',
  },
  weight: {
    key: 'weight',
    label: 'Weight',
    type: 'number',
    description: 'How much a match is worth. A magnitude only.',
  },
  polarity: {
    key: 'polarity',
    label: 'Polarity',
    type: 'string',
    description: POLARITY_DESCRIPTION,
  },
  notes: {
    key: 'notes',
    label: 'Notes',
    type: 'string',
    description: 'Why the term is here, for the next reader.',
  },
};

/**
 * What one entry is called, and the key it sits under.
 *
 * The label is load-bearing rather than decorative:
 * `../../dynamic-form/tree.ts` derives a list item's label from the
 * item def's own label and its position, so this is what makes the
 * tree read `Term 1`, `Term 2` and the breadcrumb say which one is
 * open. The contract grows no per-item label member because of it.
 */
const ENTRY_DEF_KEY = 'term';

/** What one entry is called; see {@link ENTRY_DEF_KEY}. */
const ENTRY_DEF_LABEL = 'Term';

/**
 * What the payload itself is called, and the key it sits under.
 *
 * The root def's label is the tree's root node, so this is the word
 * over the structure column and the first breadcrumb item. `Terms`
 * rather than the category's name: the category is the modal
 * header's to say, and a payload is the vocabulary rather than the
 * category.
 */
const PAYLOAD_DEF_KEY = 'terms';

/** What the payload is called; see {@link PAYLOAD_DEF_KEY}. */
const PAYLOAD_DEF_LABEL = 'Terms';

/**
 * The defs the fields presentation draws a term payload from, or
 * `null` for a shape v1 cannot express.
 *
 * A LIST whose item is the OBJECT holding the four members, which is
 * `./schema.ts`'s `termPayloadSchema` read as a shape: the payload
 * IS the category's vocabulary and there is no envelope around it.
 * So the tree's root is the list, its children are the entries, and
 * the one mounted form is one entry's four boxes.
 *
 * The header says which member forced which answer, why `polarity`
 * is free text, and why an undrawable member refuses the whole shape
 * rather than being left out of it.
 *
 * @param members - The per-member declarations to fold. Defaults to
 * this module's own; the header says why it is a parameter at all
 * and why no caller in the app passes one.
 * @returns The list def, or `null` if any member has no v1 type.
 */
export function fieldDefsForTermPayload(
  members: TermEntryMemberDefs = ENTRY_MEMBER_DEFS,
): ListFieldDef | null {
  const readings = ENTRY_MEMBER_ORDER.map((member) => members[member]);
  const fields = readings
    .filter((def): def is LeafFieldDef => def !== null);

  // One undrawable member refuses the shape. Read as a COUNT rather
  // than as a `null` search, which is what narrows the survivors to
  // the defs the item is built from with no cast.
  if (fields.length !== readings.length) {
    return null;
  }

  const item: ObjectFieldDef = {
    key: ENTRY_DEF_KEY,
    label: ENTRY_DEF_LABEL,
    type: 'object',
    fields,
  };

  return {
    key: PAYLOAD_DEF_KEY,
    label: PAYLOAD_DEF_LABEL,
    type: 'list',
    item,
  };
}
