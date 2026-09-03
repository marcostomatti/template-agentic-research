/**
 * @packageDocumentation
 * What one category's term payload has to be, as a value a runtime
 * can check: the schema the lexicon editor's JSON fallback validates
 * against before anything it produced reaches the draft.
 *
 * Beside the modal rather than inside it, for the reason `./cards.ts`
 * and `./terms.ts` give about their own halves — and for one of its
 * own. `../../components/JsonEditor.tsx` takes a schema as a PROP,
 * because the page is what knows the shape it is editing and the
 * dynamic form provider replacing that editor renders its fields from
 * the same declaration. So this file outlives the fallback it is
 * written for, and an editor points at it rather than holding it.
 *
 * ## What it mirrors
 *
 * {@link Term} in `../../data/types.ts`, which mirrors the `terms`
 * table — and only the four members the EDITOR writes: the pattern,
 * the weight, the polarity and the notes.
 *
 * `id` and `categoryId` are deliberately absent, and their absence is
 * the payload saying what an operator may change. A term's id is the
 * service's to issue and its category is the route's to carry;
 * offering either for editing would offer a row-identity change
 * nothing above this seam can honour. So a payload states a
 * category's VOCABULARY, and the rows the modal holds keep their ids
 * through a swap of presentation.
 *
 * The redeclaration rules are `../../data/types.ts`'s own, so the two
 * files agree about shape as well as about membership: a nullable
 * member is `T | null` and never optional. A payload therefore spells
 * `"notes": null` rather than leaving the key off — which is also
 * what `formatJsonDraft` writes when it seeds the box, so a round
 * trip through the editor produces a payload this schema still takes.
 *
 * ## Why a schema is declared here rather than derived from the type
 *
 * Because there is nothing to derive one from. {@link Term} is an
 * interface: it is erased before any of this runs, and what arrives
 * from the box is `unknown` — text an operator typed, parsed. A
 * validator is a VALUE and a type is not, so the mirror is written by
 * hand in this direction.
 *
 * Written by hand and CHECKED by the compiler rather than asserted in
 * prose. {@link EditableTermMembers} states what is mirrored, and
 * `./schema.test.ts` crosses it against {@link TermPayloadEntry} in
 * both directions — one function apiece — so a member added to
 * either side is a `check-types` failure naming the member rather
 * than a discovery at somebody's save. Measured live: widening the
 * polarity to `z.string()` reddens exactly those crossings.
 *
 * The other half of the answer is that a derivation would be wrong
 * even where it was available. Half of what this file says cannot be
 * said in a type at all — that a weight is not negative, that a
 * pattern is not empty, that a note is either written or absent.
 * Those are rules the editor keeps; a type can only say `number` and
 * `string`.
 *
 * ## Unknown keys are refused, not stripped
 *
 * Stripping is the default and it is the wrong default here, for a
 * reason particular to a box an operator is looking at. A key the
 * schema does not declare is one of three things: a member the editor
 * does not write (`id`, which a row copied from somewhere else brings
 * with it), a misspelling of one it does, or a member of some other
 * payload entirely. Stripping ACCEPTS all three and answers a value
 * quietly missing whatever was meant by them — and the box then
 * re-renders from that value, so the line an operator typed vanishes
 * with no sentence saying why.
 *
 * Refusing costs them a sentence naming the entry and the COUNT of
 * keys it does not declare, which is what
 * `../../components/jsonDraft.ts` builds and its header explains. The
 * difference the sentence buys is the whole difference between an
 * edit that did not take and an edit that was refused.
 *
 * ## Every refusal is one a sentence can name
 *
 * `describeSchemaIssues` builds from the issue's PATH and from the
 * schema's own vocabulary — the type expected, the bound declared,
 * the values allowed — and from nothing in the payload. That puts a
 * constraint on what may be declared here: a rule zod has no code for
 * arrives as `custom`, whose sentence reads 'does not satisfy a rule
 * the schema adds' and names nothing an operator can go and fix.
 *
 * So every rule in this file is one of zod's own, and the rules that
 * would need a refinement live elsewhere on purpose. Whether a
 * pattern repeats one the category already carries is the clearest
 * case: it is `./terms.ts`'s question, it needs the STORED list that
 * a schema is never handed, and the refusal there names the line.
 *
 * ## Two presentations of one editor, one set of rules
 *
 * The bulk-paste panel and this box write the same draft, so a term
 * one takes and the other refuses is the editor giving two answers to
 * one question. The rules line up with `parseTermBlock` branch for
 * branch:
 *
 * - An empty pattern is refused by both.
 * - A negative weight is refused by both. {@link Term.weight} is a
 *   magnitude and the direction is the polarity's, so a negative
 *   weight is not a smaller signal but a typo the polarity would
 *   silently outvote.
 * - A weight that is not a finite number is refused by both.
 *   `z.number()` rejects `NaN` and both infinities (measured), and
 *   JSON can express none of the three, so through this box the rule
 *   is unreachable — it is kept for a payload arriving any other way.
 * - A polarity outside the union is refused by both, against a list
 *   both read off {@link POLARITY_FACETS}.
 * - A weight that is not a whole number is ACCEPTED by both, because
 *   the paste branch takes any finite magnitude and a stricter rule
 *   here would refuse a payload the box beside it takes.
 *
 * The one deliberate difference is the empty note, and it is a
 * difference in what the two formats can express rather than in what
 * the editor believes. A pasted line with no fourth field has no note
 * to read, so `parseTermBlock` writes the `null` that means nobody
 * wrote one. JSON can say `""`, and `""` beside `null` would be two
 * spellings of the one state {@link Term.notes} documents. Coercing
 * would be the worse repair of the two here: this box SHOWS the
 * payload, so rewriting a value underneath an operator would leave
 * the text disagreeing with the draft it produced. A refusal says so
 * instead.
 *
 * ## What this deliberately does not answer
 *
 * Whether a payload may be SAVED, which is a question about the
 * category rather than about the payload: a pattern the category
 * already carries is a duplicate whatever bucket it sits in, and the
 * stored list that settles it is `./terms.ts`'s argument to make.
 *
 * Which row an entry came from. The payload carries no id — see above
 * — so re-associating an edited entry with the row it is a reading of
 * belongs to the branch performing the swap, which is the one place
 * holding both.
 */

import type { Term, TermPolarity } from '../../data/types';

import { z } from 'zod';

import { POLARITY_FACETS } from './cards';

/**
 * The polarities a payload may name, in the order the surface draws
 * them.
 *
 * Read off {@link POLARITY_FACETS} rather than written out, so a
 * polarity added to `TermPolarity` becomes a spelling this schema
 * accepts instead of one it goes on refusing. `./terms.ts` derives
 * its own copy from the same table rather than from this one: the
 * order and the membership belong to `./cards.ts`, and both readers
 * take them from the owner instead of from each other.
 */
const POLARITY_NAMES: readonly TermPolarity[] = POLARITY_FACETS
  .map((facet) => facet.polarity);

/**
 * The fewest characters a member an operator wrote may carry.
 *
 * One rule over two members: a pattern the editor stores has
 * something to match on, and a note that exists says something. The
 * absence of a note is `null` and never `''` — the header states why
 * the empty string is refused rather than read as the absence.
 */
const MIN_TEXT_LENGTH = 1;

/**
 * The smallest weight a term may carry.
 *
 * Zero rather than one, because a term carrying no signal is a
 * legitimate row: {@link Term.weight} says the seed keeps an
 * `ignore` term's magnitude, so suspending one is an edit of the
 * polarity alone.
 */
const MIN_WEIGHT = 0;

/**
 * The {@link Term} members a payload entry mirrors.
 *
 * Named here because the mirror is this module's claim to make. The
 * schema below is written by hand against it — the header says why
 * it cannot be derived — and `./schema.test.ts` crosses this type
 * and {@link TermPayloadEntry} in BOTH directions, so a member that
 * drifts on either side is a `check-types` failure naming the member
 * rather than a discovery at somebody's save.
 *
 * A caller mapping an entry back onto the row it is a reading of
 * wants this too: a stored row satisfies it unchanged.
 */
export type EditableTermMembers = Pick<
  Term,
  'pattern' | 'weight' | 'polarity' | 'notes'
>;

/**
 * One term, as a payload carries it.
 *
 * Private, because what the fallback validates is the LIST: every
 * case next door drives an entry through {@link termPayloadSchema},
 * so the subject under test is the payload an editor actually hands
 * over. The TYPE is exported — mapping an entry back onto the row it
 * is a reading of is a caller's job, and a caller needs a name for
 * what it is holding.
 */
const termPayloadEntrySchema = z.strictObject({
  pattern: z.string().min(MIN_TEXT_LENGTH),
  weight: z.number().min(MIN_WEIGHT),
  polarity: z.enum(POLARITY_NAMES),
  notes: z.string().min(MIN_TEXT_LENGTH)
    .nullable(),
});

/**
 * What one category's term payload has to be.
 *
 * A LIST and not an envelope around one: the payload IS the
 * category's vocabulary, and a key wrapping it would be a name
 * nothing else in this editor uses — one that every entry's path
 * would then carry into every sentence. An empty list is accepted,
 * because a category may carry no vocabulary and an editor has to be
 * able to show one that does not.
 *
 * The order is the draft's own and means nothing more: `terms`
 * records no order, which is the argument `./terms.ts` makes at
 * length about where a dropped row lands.
 */
export const termPayloadSchema = z.array(termPayloadEntrySchema);

/**
 * One entry of a term payload — the four members the editor writes.
 *
 * A narrowing of {@link Term} by construction rather than by
 * assertion: `./schema.test.ts` holds the assignability both ways, so
 * a member that drifts from the fixture type is reported by
 * `check-types` and named.
 */
export type TermPayloadEntry = z.infer<typeof termPayloadEntrySchema>;

/**
 * A category's term payload: what the JSON fallback validates against.
 *
 * This is the type `JsonEditor` is parameterised by on the lexicon's
 * fallback branch — its `value`, its `onChange` and its `schema` are
 * the whole contract that component keeps, and all three are this
 * shape.
 */
export type TermPayload = z.infer<typeof termPayloadSchema>;
