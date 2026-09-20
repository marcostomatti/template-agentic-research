/**
 * @packageDocumentation
 * The value half of the app's `renderForm` slot: a report's answers
 * read as the record `src/dynamic-form/` edits, that record read
 * back as answers, and the schema every edit is checked against.
 *
 * `./reportFormAdapter.ts` maps a template's FIELDS onto defs; this
 * module maps its ANSWERS. The two are separate because they run at
 * different rates — a def list is built once per template, a value
 * crosses on every keystroke — and because the def mapping is the
 * one the spec names. `./ReportForm.tsx` is the only caller of
 * either.
 *
 * A `.ts` rather than a part of the drawing, for the reason every
 * decision in this package lives in one: the unit runner collects
 * the `.test.ts` files under `src/` in a NODE environment, so a
 * rule written inside a `.tsx` is reachable by no unit case at all.
 * What is left in `./ReportForm.tsx` is a ref, an effect and two
 * DOM lookups, none of which a node runner could hold anyway.
 *
 * ## Two vocabularies, and where they differ
 *
 * `@ar/dev-tools`'s `FeedbackValues` is `string | readonly
 * string[]` per field id: the package's own renderer writes text
 * for a control and a list of ticked values for a `checkboxes`
 * field, and `body.ts` reads exactly those two shapes.
 *
 * What `DynamicForm` edits is the payload the DEFS describe:
 * `./reportFormAdapter.ts` makes a `checkboxes` field an OBJECT of
 * booleans keyed by each option's value, and
 * `src/dynamic-form/readers.ts` answers `null` for a text box that
 * was cleared. So {@link ReportFormMember} carries three shapes the
 * feedback record has no spelling for, and this module is the whole
 * of the translation.
 *
 * ## An unanswered select is left ABSENT, deliberately
 *
 * `src/dynamic-form/ChoiceField.tsx` opens an enum whose member is
 * `undefined` at the head of its options and REPORTS that opening
 * through `onValueChange`, once per mount. Leaving the key absent
 * is therefore the one mapping under which what an operator SEES
 * and what the report SAYS agree: the select draws its first option
 * and the same option lands in the record.
 *
 * Seeding the head here instead would look identical and file
 * differently — nothing would report the seed, so a select the
 * operator never touched would draw `Blocker` and reach the tracker
 * unanswered. That is the divergence {@link toReportFormValue}
 * exists to avoid, and it is why {@link ReportFormMember} includes
 * `undefined` and why the schema below makes an enum optional.
 *
 * ## A cleared box is `null` here and `''` there
 *
 * `readStringField` answers `null` for a box holding nothing — the
 * provider's spelling for an emptied member — while `FeedbackValues`
 * has only the empty string. {@link toFeedbackValues} therefore
 * writes `''` for it, which `body.ts`'s `asText` already reads as
 * unanswered, and the schema accepts `null` so that clearing a box
 * is an accepted edit rather than a refusal banner.
 *
 * ## What never travels back
 *
 * A `readonly` block's text is the DESCRIPTOR's, not an answer:
 * `body.ts`'s `renderAnswer` answers `null` for every `readonly`
 * field, so the context block reaches the tracker from the template
 * the feature composed and never from this form. Writing its text
 * into the record would put a key nothing reads beside the answers,
 * so {@link toFeedbackValues} skips it.
 *
 * Everything the form does NOT draw survives: the record handed in
 * is the base of the record answered, so a key from another
 * template — or the selector the picker wrote while this subtree
 * was unmounted — is carried rather than dropped. The drawer's
 * `store.write({values})` replaces the whole record, so anything
 * this module dropped would be gone.
 *
 * ## A shape no control can produce reads as unanswered
 *
 * {@link toFeedbackValues} runs inside a change report, on the path
 * between an edit and the drawer's store. A throw there takes the
 * widget's React root down, so a member of the wrong shape — boxes
 * where text was expected, or the reverse — reads as unanswered
 * instead. The package's own renderer states the same rule on its
 * `textOf`. Every refusal this module does raise is a BUILD-time
 * one, raised by {@link reportFormSchema} while the form is being
 * drawn, where `./reportFormAdapter.ts` has already refused the
 * same template for the same reason.
 *
 * ## Mutation note
 *
 * A green suite is no evidence a case can fail. Measured over
 * `./reportFormValues.test.ts` at 33 cases, run as `bun x vitest
 * run src/dev/reportFormValues.test.ts` from `packages/web`. Each
 * leg broke this file, read the count, and restored it
 * byte-identical — a SHA-256 of the restored text compared against
 * the original's, all six legs clean. The baseline is `Tests 33
 * passed (33)`, and `bun x tsc --noEmit` exits `0` under every
 * leg, measured one at a time, so not one of them is a type error
 * somebody would have caught without the suite.
 *
 * - Seeding an unanswered select at the head option rather than
 *   leaving the key absent answers `Tests 3 failed | 30 passed
 *   (33)`: both `leaves an unanswered select ...` cases and the
 *   walk over a whole template. That leg is the one that measures
 *   the paragraph above; nothing else says the key is left out on
 *   purpose.
 * - Writing the `readonly` block back into the record answers `1
 *   failed | 32 passed`, whose `toStrictEqual` reads the ABSENCE
 *   of that key rather than its value.
 * - Building the answered record from `{}` rather than from the
 *   record handed in answers `2 failed | 31 passed`: `carries a
 *   key the form does not draw`, and the select member the form
 *   does not hold yet.
 * - Ticking the boxes in the order the member's keys happen to be
 *   in rather than in template order answers `1 failed | 32
 *   passed`.
 * - Dropping `.nullable()` from the text member's schema answers
 *   `1 failed | 32 passed`: `accepts a cleared box`, which is the
 *   leg that measures the `null` paragraph above.
 * - Dropping the empty-option refusal answers `2 failed | 31
 *   passed`, one per kind that declares choices.
 */

import type {
  FeedbackFieldValue,
  FeedbackValues,
  ReportFormField,
} from '@ar/dev-tools/feedback';
import type { ZodType } from 'zod';

import { z } from 'zod';

/** One choice out of a declared list. */
type ReportSelectField = Extract<ReportFormField, { kind: 'select' }>;

/** Independent boxes under one label. */
type ReportCheckboxesField
  = Extract<ReportFormField, { kind: 'checkboxes' }>;

/** Text that is shown and never edited. */
type ReportReadonlyField = Extract<ReportFormField, { kind: 'readonly' }>;

/**
 * What a text-shaped leaf holds.
 *
 * `null` is the provider's spelling for a box that was cleared —
 * see this module's documentation — and never a value this module
 * writes into a fresh record.
 */
export type ReportFormText = string | null;

/** What a `checkboxes` field holds: one flag per box, by value. */
export type ReportFormBoxes = Readonly<Record<string, boolean>>;

/**
 * One member of the record the provider edits.
 *
 * `undefined` is a member the record does not hold, which is what
 * an unanswered select is left as on purpose.
 */
export type ReportFormMember
  = ReportFormText | ReportFormBoxes | undefined;

/** The whole payload one report form edits. */
export type ReportFormValue = Readonly<Record<string, ReportFormMember>>;

/** One schema per box of a `checkboxes` field, keyed by value. */
type BoxShape = Record<string, ZodType<boolean>>;

/** One schema per drawn field, keyed by the field's id. */
type MemberShape = Record<string, ZodType<ReportFormMember>>;

/**
 * Why a field declaring choices arrived with none.
 *
 * The same shape of sentence `./reportFormAdapter.ts` raises, and
 * unreachable through the same path for the same reason: the
 * template parse refuses an empty option list at the endpoint and
 * again in the browser, and the def mapping refuses it once more
 * before this schema is ever built.
 *
 * @param kind - The field's kind, for the sentence.
 * @param id - The field the template gave no option.
 * @returns The message, naming both.
 */
function noOptionMessage(kind: string, id: string): string {
  return `Report field ${id} is a ${kind} with no option; a schema `
    + 'over a choice that offers none cannot be built.';
}

/**
 * A kind no case claimed.
 *
 * Takes `never`, so a seventh kind added to `ReportFormField` is a
 * `check-types` error at each switch below rather than a throw on
 * somebody else's screen.
 *
 * @param field - The descriptor no case above claimed.
 * @returns Never; the call does not return.
 * @throws Always, naming the kind that reached it.
 */
function unreachableReportKind(field: never): never {
  const { kind } = field as Record<string, unknown>;

  throw new Error(`Unknown report field kind: ${String(kind)}`);
}

/**
 * Read one stored answer as the text a single-value control shows.
 *
 * @param value - Whatever the record held for the field.
 * @returns The text, or `''` for an unanswered field and for a list,
 * which no single-value field of this form can hold.
 */
function storedText(value: FeedbackFieldValue | undefined): string {
  return typeof value === 'string'
    ? value
    : '';
}

/**
 * Read one stored answer as the list of ticked values.
 *
 * @param value - Whatever the record held for the field.
 * @returns The ticked values, or an empty list for an unanswered
 * field and for a single value, which no `checkboxes` field of this
 * form can hold.
 */
function storedList(
  value: FeedbackFieldValue | undefined,
): readonly string[] {
  if (value === undefined || typeof value === 'string') {
    return [];
  }

  return value;
}

/**
 * A select's option values, refusing a select that offers none.
 *
 * @param field - The select being read.
 * @returns Its option values, in template order.
 * @throws If the field arrived with no option at all.
 */
function optionValuesOf(
  field: ReportSelectField | ReportCheckboxesField,
): readonly string[] {
  if (field.options.length === 0) {
    throw new Error(noOptionMessage(field.kind, field.id));
  }

  return field.options.map((option) => option.value);
}

/**
 * A `checkboxes` field's boxes, as one flag each.
 *
 * Keyed by the OPTION's value, which is what
 * `./reportFormAdapter.ts` keys its leaves by; the two spellings
 * have to agree or an edit would write a member no def draws.
 *
 * @param field - The field being opened.
 * @param value - Whatever the record held for it.
 * @returns One boolean per box, in template order.
 */
function openBoxes(
  field: ReportCheckboxesField,
  value: FeedbackFieldValue | undefined,
): ReportFormBoxes {
  const ticked = storedList(value);

  return Object.freeze(field.options.reduce<Record<string, boolean>>(
    (carried, option) => ({
      ...carried,
      [option.value]: ticked.includes(option.value),
    }),
    {},
  ));
}

/**
 * A select's member, as the provider should find it.
 *
 * A stored option is itself; anything else — an unanswered field,
 * the empty string the package's own renderer writes for an
 * unchosen select, a value no option carries — is left ABSENT, so
 * `ChoiceField` opens at the head and reports what it opened at.
 * See this module's documentation.
 *
 * @param field - The select being opened.
 * @param value - Whatever the record held for it.
 * @returns The chosen option, or `undefined`.
 * @throws If the field arrived with no option at all.
 */
function openSelect(
  field: ReportSelectField,
  value: FeedbackFieldValue | undefined,
): ReportFormMember {
  const chosen = storedText(value);

  return optionValuesOf(field).includes(chosen)
    ? chosen
    : undefined;
}

/**
 * One field's member, as the form opens it.
 *
 * @param field - The descriptor, over the six kinds a renderer is
 * handed.
 * @param values - Every answer the record holds.
 * @returns The member the provider edits.
 * @throws If a kind outside the six reached it, or if a field
 * declaring choices arrived with none.
 */
function openMember(
  field: ReportFormField,
  values: FeedbackValues,
): ReportFormMember {
  const held = values[field.id];

  switch (field.kind) {
    case 'text':
    case 'textarea':
    case 'selector':
      return storedText(held);

    case 'select':
      return openSelect(field, held);

    case 'checkboxes':
      return openBoxes(field, held);

    case 'readonly':
      return field.value;

    default:
      return unreachableReportKind(field);
  }
}

/**
 * Read one edited member as the text an answer is stored as.
 *
 * @param member - What the provider holds for the field.
 * @returns The text, `''` for a cleared box, or `null` for a member
 * the form does not hold and for a shape no control can produce —
 * both of which leave the record's own value standing.
 */
function answeredText(member: ReportFormMember): FeedbackFieldValue | null {
  if (member === null) {
    return '';
  }

  return typeof member === 'string'
    ? member
    : null;
}

/**
 * Read one edited member as the list of ticked values.
 *
 * Template order rather than tick order, because the boxes are read
 * off the DEF list: the package's own renderer appends a value as
 * it is ticked, and this one cannot, having no record of when.
 *
 * @param field - The field being read.
 * @param member - What the provider holds for it.
 * @returns The ticked values in template order, or `null` for a
 * shape no control can produce.
 */
function answeredList(
  field: ReportCheckboxesField,
  member: ReportFormMember,
): FeedbackFieldValue | null {
  if (member === null || member === undefined || typeof member === 'string') {
    return null;
  }

  return field.options
    .filter((option) => member[option.value] === true)
    .map((option) => option.value);
}

/**
 * One field's answer, as the feedback record spells it.
 *
 * @param field - The descriptor, over the six kinds a renderer is
 * handed.
 * @param member - What the provider holds for the field.
 * @returns The answer, or `null` for a field this form never writes
 * back — a `readonly` block, a member the record does not hold, and
 * a shape no control can produce.
 * @throws If a kind outside the six reached it.
 */
function answeredValue(
  field: ReportFormField,
  member: ReportFormMember,
): FeedbackFieldValue | null {
  switch (field.kind) {
    case 'text':
    case 'textarea':
    case 'selector':
    case 'select':
      return answeredText(member);

    case 'checkboxes':
      return answeredList(field, member);

    case 'readonly':
      return null;

    default:
      return unreachableReportKind(field);
  }
}

/**
 * The schema one text-shaped leaf is checked against.
 *
 * Nullable, because `readStringField` answers `null` for a cleared
 * box and a schema refusing that would answer a cleared field with
 * the provider's refusal banner.
 *
 * @returns The member schema.
 */
function textSchema(): ZodType<ReportFormMember> {
  return z.string().nullable();
}

/**
 * The schema one read-only block is checked against.
 *
 * A literal over the block's own text, which is the guarantee the
 * def mapping makes from the other side: `./reportFormAdapter.ts`
 * draws it as an enum over exactly one option, so no edit can move
 * it, and this refuses the write that a widened def would let
 * through.
 *
 * @param field - The block being drawn.
 * @returns The member schema.
 */
function readonlySchema(
  field: ReportReadonlyField,
): ZodType<ReportFormMember> {
  return z.literal(field.value);
}

/**
 * The schema one field's member is checked against.
 *
 * @param field - The descriptor, over the six kinds a renderer is
 * handed.
 * @returns The member schema.
 * @throws If a kind outside the six reached it, or if a field
 * declaring choices arrived with none.
 */
function memberSchema(field: ReportFormField): ZodType<ReportFormMember> {
  switch (field.kind) {
    case 'text':
    case 'textarea':
    case 'selector':
      return textSchema();

    case 'select':
      // Optional for the reason this module's documentation gives:
      // an unanswered select is a member the record does not hold
      // until `ChoiceField` reports the option it opened at.
      return z.enum(optionValuesOf(field)).optional();

    case 'checkboxes':
      return z.object(optionValuesOf(field).reduce<BoxShape>(
        (carried, value) => ({ ...carried, [value]: z.boolean() }),
        {},
      ));

    case 'readonly':
      return readonlySchema(field);

    default:
      return unreachableReportKind(field);
  }
}

/**
 * Whether the drawn fields include the widget's selector field.
 *
 * Read by `./ReportForm.tsx` before it complains about a selector
 * control it could not find: a template that opted out of the
 * picker draws none, and warning about that would be noise on every
 * bug report.
 *
 * @param fields - The chosen template's fields, screenshot already
 * withheld.
 * @returns Whether any of them is a `selector` field.
 */
export function drawsSelectorField(
  fields: readonly ReportFormField[],
): boolean {
  return fields.some((field) => field.kind === 'selector');
}

/**
 * Read a report's answers as the record the provider edits.
 *
 * Pure: it reads its two arguments, mutates neither, and answers a
 * fresh frozen record.
 *
 * @param fields - The chosen template's fields, in template order.
 * @param values - Every answer the drawer holds, keyed by field id.
 * @returns One member per drawn field, bar an unanswered select —
 * see this module's documentation.
 * @throws If a kind outside the six reached it, or if a field
 * declaring choices arrived with none.
 */
export function toReportFormValue(
  fields: readonly ReportFormField[],
  values: FeedbackValues,
): ReportFormValue {
  return Object.freeze(fields.reduce<Record<string, ReportFormMember>>(
    (carried, field) => {
      const member = openMember(field, values);

      return member === undefined
        ? carried
        : { ...carried, [field.id]: member };
    },
    {},
  ));
}

/**
 * Read the edited record back as the answers a report carries.
 *
 * Pure: it reads its three arguments, mutates none of them, and
 * answers a fresh frozen record built ON the one it was handed, so
 * a key this form does not draw survives the round trip.
 *
 * @param fields - The chosen template's fields, in template order.
 * @param values - The answers as the drawer holds them now.
 * @param form - What the provider reported.
 * @returns The next answers, for the drawer's whole-record write.
 * @throws If a kind outside the six reached it.
 */
export function toFeedbackValues(
  fields: readonly ReportFormField[],
  values: FeedbackValues,
  form: ReportFormValue,
): FeedbackValues {
  return Object.freeze(fields.reduce<
    Record<string, FeedbackFieldValue | undefined>
  >(
    (carried, field) => {
      const answer = answeredValue(field, form[field.id]);

      return answer === null
        ? carried
        : { ...carried, [field.id]: answer };
    },
    { ...values },
  ));
}

/**
 * What the edited record has to satisfy on every edit.
 *
 * `DynamicForm` checks the WHOLE candidate against this after every
 * keystroke and reports only what it accepts, so the schema is the
 * shape of the record {@link toReportFormValue} builds and nothing
 * narrower — bar the two guarantees worth pinning: a select answers
 * one of its options, and a read-only block answers its own text.
 *
 * @param fields - The chosen template's fields, in template order.
 * @returns The schema over the whole payload.
 * @throws If a kind outside the six reached it, or if a field
 * declaring choices arrived with none.
 */
export function reportFormSchema(
  fields: readonly ReportFormField[],
): ZodType<ReportFormValue> {
  return z.object(fields.reduce<MemberShape>(
    (carried, field) => ({ ...carried, [field.id]: memberSchema(field) }),
    {},
  ));
}
