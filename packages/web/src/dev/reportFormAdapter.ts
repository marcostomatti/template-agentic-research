/**
 * @packageDocumentation
 * The app's half of the `renderForm` slot: a report template's
 * `ReportField` list read as a `src/dynamic-form/` def tree and the
 * action table that tree is proved against.
 *
 * Decision 9 of `.rafa/specs/q20b-2-feedback-feature.md` puts this
 * module in the APP: `@ar/dev-tools` depends on no design system and
 * ships a plain-HTML renderer of its own, while this app already
 * owns a form renderer that draws in its language. The adapter is
 * the translation between the two vocabularies, and it is a pure
 * one — no React, no DOM, no clock, no module state — which is what
 * lets `./reportFormAdapter.test.ts` hold every mapping decision
 * flat. The drawing over what this answers is `./ReportForm.tsx`,
 * this stage's next module, and it owns the one thing a pure
 * mapping cannot do: tagging the selector field's rendered
 * control.
 *
 * ## Six kinds arrive, not seven
 *
 * `ReportFormField` is `@ar/dev-tools/feedback`'s own union with the
 * `file` member removed, so the screenshot descriptor is a
 * `check-types` refusal at a caller rather than a kind this switch
 * has to decide about. The screenshot control is the FEATURE's under
 * both renderers; an image that may not leave the machine is handled
 * by one piece of code rather than by whichever renderer the host
 * passed.
 *
 * ## The root is one `object` def
 *
 * `DynamicForm` takes a `ContainerFieldDef` rather than a list, so
 * the mapping wraps the fields in an object def, which is also what
 * makes the answered value one record per report rather than a bare
 * field list.
 *
 * Of that wrapper's two required members, only the LABEL is drawn:
 * `tree.ts`'s `formTree` roots the node tree at `def.label`, so
 * {@link REPORT_FORM_ROOT_LABEL} is what the left column calls the
 * form. {@link REPORT_FORM_ROOT_KEY} is read by nothing — a path
 * starts at `ROOT_PATH`, which is `[]` and which `pathKey` spells
 * `$` — and it exists because every def carries a key. It is
 * exported anyway, so a caller asserting about the root names the
 * same string this file does.
 *
 * ## What each kind becomes, and what that costs
 *
 * - `text` and `textarea` both become a `string` leaf. The def
 *   contract has one text type and `./registry.ts` draws it as one
 *   control, so a multi-line answer is typed in a single-line box.
 *   The body builder still fences a `textarea` answer that declared
 *   a `render` language — that is `body.ts`'s reading of the
 *   TEMPLATE, not of what the operator typed in — so nothing about
 *   the report changes; only the typing room does.
 * - `select` becomes an `enum` carrying its options in template
 *   order. `EnumFieldDef.options` is a non-empty tuple, which is
 *   where the first refusal below comes from, and `values.ts` opens
 *   an unanswered enum at the HEAD of that tuple. So a select this
 *   renderer draws is answered by its first option until an operator
 *   picks another, where a GitHub dropdown would submit nothing. The
 *   contract offers no empty choice to map onto — the descriptor's
 *   own schema makes an option value `.min(1)` — so this is a
 *   difference between the two renderers rather than a bug in
 *   either.
 * - `checkboxes` becomes an `object` of `boolean` leaves, one per
 *   box, keyed by the option's own value. An object def is a node
 *   the tree drills into rather than a row drawn inline, so the
 *   boxes of one field sit behind one click in the left column.
 *   That is the shape the provider's no-recursive-form ruling
 *   leaves: several controls under one heading is exactly what an
 *   object node is for.
 * - `selector` becomes a `string` leaf carrying the
 *   {@link PICK_ELEMENT_ACTION_ID} action. The def names an id and a
 *   label and never a function, so what pressing it DOES stays with
 *   `./ReportForm.tsx`, which is the only module here that may touch
 *   the document.
 * - `readonly` becomes the one leaf no edit can change — see below.
 *
 * ## `readonly`, and the `disabled` this contract does not have
 *
 * `src/dynamic-form/fieldDef.ts` carries no `disabled` member and no
 * `readOnly` mode: `DynamicForm.tsx` says so in as many words ("no
 * `readOnly` mode here: v1 has no caller for one"), and no leaf
 * control takes such a prop. Measured rather than assumed — a grep
 * for `disabled` and `readOnly` over `src/dynamic-form/` answers
 * NOTHING in the seven `.ts` files that hold the contract, their
 * cases included, and outside them prose plus four lines of `.tsx`:
 * the action button's pending `disabled` with its two class names,
 * and the list's move button.
 *
 * So the disabled leaf this mapping wants cannot be asked for, and
 * what is asked for instead is the one leaf shape whose value no
 * edit can move: an `enum` carrying exactly ONE option, the block's
 * own text as both the stored value and the drawn label.
 * `values.ts` opens it at that option, `readers.ts` accepts no
 * spelling but that one, and a select with a single choice has no
 * other answer to offer. It is a weaker DRAWING than the default
 * renderer's `<pre>` and an equal GUARANTEE about the value, which
 * is the half that matters: the context block reaches the tracker
 * from the descriptor the feature built, never from this form —
 * `body.ts`'s `renderAnswer` answers `null` for every `readonly`
 * field — so an operator cannot rewrite what a report says about
 * their machine.
 *
 * A real disabled affordance is a change to the dynamic-form
 * contract and to every leaf control under it. This task does not
 * make one.
 *
 * ## What the mapping deliberately drops
 *
 * `required`, `placeholder` and `render` have no member to land on,
 * and none is faked:
 *
 * - `required` is a GitHub issue-form property. The package's
 *   `submitRules.ts` states that it refuses nothing over it,
 *   because it is "the renderer's to enforce at the control that
 *   holds it"; this renderer has no control that holds it.
 *   Decorating the label with a marker word would put prose nobody
 *   wrote into the form and into every later locator, so the loss
 *   is recorded here instead.
 * - `placeholder` is a `text`, `textarea` and `selector` property
 *   the def contract has no member for.
 * - `render` is read by the body builder and never by a control.
 *
 * A description IS carried, on every kind that declares one.
 *
 * ## Why the action table is an argument and comes back out
 *
 * The table is a caller's: the drawing owns the handler that
 * reaches the document, and a pure module may not hold one. Taking
 * it lets the mapping PROVE the pair before anything renders,
 * through `assertActions` — the very function `DynamicForm` calls at
 * mount, so the two cannot disagree about what "the table holds this
 * id" means. What comes back is that same table, unchanged, beside
 * the defs it was proved against: one verified pair to spread into
 * the form rather than two values a caller has to keep together.
 *
 * ## Five refusals, and why each one throws
 *
 * A field list with nothing in it; two defs of one scope claiming a
 * key; a `select` or `checkboxes` arriving with no option; a kind
 * outside the six; an action id the table does not hold.
 *
 * Four of the five are unreachable through the validated path —
 * `src/core/reportTemplate.ts` refuses empty option lists and
 * duplicate field ids at the endpoint AND again in the browser, the
 * withheld `file` kind is a `check-types` error at a typed caller,
 * and the action id is written in this file — so each says
 * something upstream is broken rather than something an operator
 * did. The fifth is not: see {@link assertUniqueKeys} for the one
 * collision no schema refuses.
 *
 * A throw naming the field is what a developer can act on; a
 * silently dropped field is the quietest way a form can lose a
 * question.
 *
 * ## Mutation note
 *
 * A green suite is not evidence a case can fail. Measured over
 * `./reportFormAdapter.test.ts` at 22 cases, run as `bun x vitest
 * run src/dev/reportFormAdapter.test.ts` from `packages/web`. Each
 * leg broke this file, read the count, and restored it
 * byte-identical — a SHA-256 of the restored text compared against
 * the original's, all six legs clean. The baseline is `Tests 22
 * passed (22)`, and `bun x tsc --noEmit` exits `0` under every leg,
 * so not one of them is a type error somebody would have caught
 * without the suite.
 *
 * - Mapping `textarea` to `number` while `text` stays `string`
 *   answers `Tests 2 failed | 20 passed (22)`: `maps a textarea onto
 *   the same string leaf a text field maps onto`, and the walk over
 *   a whole template.
 * - Dropping the {@link assertActions} call answers `1 failed | 21
 *   passed`: `refuses an action id the table would not hold`, as
 *   `expected [Function] to throw an error`.
 * - Reading `readonly` as an ordinary `string` leaf answers `3
 *   failed | 19 passed` — the single-option case, the
 *   fallback-label case and the template walk. That leg is the one
 *   that measures the paragraph above: nothing but those three
 *   cases says this block is unanswerable.
 * - Keying a checkbox leaf by the FIELD's id rather than the
 *   option's value answers `6 failed | 16 passed`. Five of the six
 *   fall out of {@link assertUniqueKeys}: every case mapping the
 *   two-box fixture now refuses, which is what proves that walk
 *   reaches inside an object rather than only across the root.
 * - Dropping the {@link assertUniqueKeys} call answers `2 failed |
 *   20 passed`, one per collision that walk covers — the two
 *   top-level fields and the two boxes of one field.
 * - Answering `{ ...actions }` rather than the table itself answers
 *   `1 failed | 21 passed`: `answers the very table it was handed,
 *   not a copy`.
 */

import type { FieldActionTable } from '../dynamic-form/actions';
import type {
  ContainerFieldDef,
  EnumFieldDef,
  EnumOption,
  FieldDef,
  ObjectFieldDef,
} from '../dynamic-form/fieldDef';
import type { ReportFormField } from '@ar/dev-tools/feedback';

import { assertActions } from '../dynamic-form/actions';

/**
 * The id the selector field's action names in the table.
 *
 * Opaque to the dynamic form, which matches the string and never
 * interprets it. The drawing registers its handler under this id;
 * nothing else in the app may claim it.
 */
export const PICK_ELEMENT_ACTION_ID = 'pick-element';

/**
 * What the selector field's action button is called on screen.
 *
 * Carried on the def rather than on the handler, and it is also the
 * button's accessible name — which is what the drawing keys its
 * container lookup on when it tags the control beside it
 * `data-devtools-field="selector"`. Rewording it moves that lookup,
 * so the word lives here and is imported rather than retyped.
 */
export const PICK_ELEMENT_ACTION_LABEL = 'Pick element';

/**
 * The key the root object def carries.
 *
 * Read by nothing — see this module's documentation — and named
 * rather than left to a literal so a caller asserts against the
 * same string.
 */
export const REPORT_FORM_ROOT_KEY = 'report';

/** What the tree's left column calls the whole form. */
export const REPORT_FORM_ROOT_LABEL = 'Report';

/**
 * The heading an unlabelled read-only block is drawn under.
 *
 * `readonly` is the one kind whose label is optional — a GitHub
 * `markdown` body item has none — and every def carries a label, so
 * a block that named itself nothing is named here.
 */
export const REPORT_FORM_READONLY_LABEL = 'Details';

/** Why a field list with nothing in it is refused. */
const NO_FIELDS
  = 'A report form draws at least one field; a template holding '
  + 'none is refused rather than mapped.';

/** One choice out of a declared list. */
type ReportSelectField = Extract<ReportFormField, { kind: 'select' }>;

/** Independent boxes under one label. */
type ReportCheckboxesField
  = Extract<ReportFormField, { kind: 'checkboxes' }>;

/** Text that is shown and never edited. */
type ReportReadonlyField = Extract<ReportFormField, { kind: 'readonly' }>;

/** What {@link adaptReportForm} answers: a def tree and its table. */
export interface ReportFormMapping {
  /**
   * The whole form as one container def.
   *
   * An `ObjectFieldDef` in practice; typed as the container union
   * because that is what `DynamicForm` takes, and a caller has no
   * reason to narrow it.
   */
  readonly defs: ContainerFieldDef;

  /**
   * The table {@link ReportFormMapping.defs} was proved against.
   *
   * The caller's own table, unchanged — see this module's
   * documentation for why it comes back out at all.
   */
  readonly actions: FieldActionTable;
}

/**
 * Why a field declaring choices arrived with none.
 *
 * @param kind - The field's kind, for the sentence.
 * @param id - The field the template gave no option.
 * @returns The message, naming both.
 */
function noOptionMessage(kind: string, id: string): string {
  return `Report field ${id} is a ${kind} with no option; a form `
    + 'that offers no choice is refused rather than mapped.';
}

/**
 * Why two defs of one scope may not claim one key.
 *
 * @param key - The key both defs claimed.
 * @returns The message, naming it.
 */
function duplicateKeyMessage(key: string): string {
  return `Two report fields map onto the key ${key}; the second `
    + 'would overwrite the first rather than draw beside it.';
}

/**
 * A kind no case claimed.
 *
 * Takes `never`, so a seventh kind added to `ReportFormField` is a
 * `check-types` error at the switch below rather than a throw on
 * somebody else's screen. The read goes through a record type
 * because the value IS real at runtime — a descriptor that arrived
 * without types, the withheld `file` among them — and the message
 * should name what came.
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
 * A select's choices, as the non-empty tuple the def contract wants.
 *
 * The head is READ rather than assumed: `ReportField`'s own schema
 * demands at least one option, and this is the reading that turns
 * that demand into a refusal here instead of a cast.
 *
 * @param field - The select being mapped.
 * @returns Its options, in template order.
 * @throws If the field arrived with no option at all.
 */
function enumOptionsOf(
  field: ReportSelectField,
): EnumFieldDef['options'] {
  const [head, ...rest]: readonly EnumOption[] = field.options.map(
    (option) => ({
      value: option.value,
      label: option.label,
    }),
  );

  if (head === undefined) {
    throw new Error(noOptionMessage(field.kind, field.id));
  }

  return [head, ...rest];
}

/**
 * A checkboxes field's boxes, one `boolean` leaf per option.
 *
 * Keyed by the OPTION's value rather than by the field's id, which
 * is what lets the answered object read as one flag per box —
 * `{ [value]: true }` — and what the body builder's list of ticked
 * values is a projection of.
 *
 * A box's `required` is not expressed; see this module's
 * documentation for the three properties this mapping drops.
 *
 * @param field - The checkboxes field being mapped.
 * @returns One leaf per box, in template order.
 * @throws If the field arrived with no option at all.
 */
function checkboxDefsOf(
  field: ReportCheckboxesField,
): readonly FieldDef[] {
  if (field.options.length === 0) {
    throw new Error(noOptionMessage(field.kind, field.id));
  }

  return field.options.map((option) => ({
    type: 'boolean',
    key: option.value,
    label: option.label,
  }));
}

/**
 * A read-only block as the one leaf no edit can change.
 *
 * An `enum` over a single option whose value is the block's text.
 * See this module's documentation for why that is what a "disabled
 * leaf" maps to in a contract carrying no disabled member.
 *
 * @param field - The read-only field being mapped.
 * @returns The leaf, labelled by the block or by
 * {@link REPORT_FORM_READONLY_LABEL} where it carries no label.
 */
function readonlyDefOf(field: ReportReadonlyField): EnumFieldDef {
  return {
    type: 'enum',
    key: field.id,
    label: field.label ?? REPORT_FORM_READONLY_LABEL,
    description: field.description,
    options: [{ value: field.value, label: field.value }],
  };
}

/**
 * One report field, as the def that draws it.
 *
 * @param field - The descriptor, over the six kinds a renderer is
 * handed.
 * @returns The def, carrying the field's id as its key.
 * @throws If a kind outside the six reached it, or if a field
 * declaring choices arrived with none.
 */
function fieldDefOf(field: ReportFormField): FieldDef {
  switch (field.kind) {
    case 'text':
    case 'textarea':
      return {
        type: 'string',
        key: field.id,
        label: field.label,
        description: field.description,
      };

    case 'select':
      return {
        type: 'enum',
        key: field.id,
        label: field.label,
        description: field.description,
        options: enumOptionsOf(field),
      };

    case 'checkboxes':
      return {
        type: 'object',
        key: field.id,
        label: field.label,
        description: field.description,
        fields: checkboxDefsOf(field),
      };

    case 'selector':
      return {
        type: 'string',
        key: field.id,
        label: field.label,
        description: field.description,
        action: {
          id: PICK_ELEMENT_ACTION_ID,
          label: PICK_ELEMENT_ACTION_LABEL,
        },
      };

    case 'readonly':
      return readonlyDefOf(field);

    default:
      return unreachableReportKind(field);
  }
}

/**
 * Refuse a def list in which two defs of one scope claim a key.
 *
 * Two collisions reach here and no schema upstream refuses either.
 * `src/core/reportTemplate.ts` refuses a template whose FIELDS share
 * an id, at the endpoint and again in the browser, but the widget's
 * own fields are appended to a template's after both were
 * validated, so a template field named like the context block is
 * seen by neither. And that schema says nothing at all about two
 * boxes of one `checkboxes` field sharing an option VALUE, which
 * this mapping turns into two leaves of one object.
 *
 * One scope per object, which is why the recursion starts a fresh
 * set: a box named like a top-level field is no collision, the two
 * sitting at different paths.
 *
 * @param defs - The defs of one object, in template order.
 * @returns Nothing; it is called for the throw.
 * @throws At the first key claimed twice in one scope, naming it.
 */
function assertUniqueKeys(defs: readonly FieldDef[]): void {
  const seen = new Set<string>();

  for (const def of defs) {
    if (seen.has(def.key)) {
      throw new Error(duplicateKeyMessage(def.key));
    }

    seen.add(def.key);

    if (def.type === 'object') {
      assertUniqueKeys(def.fields);
    }
  }
}

/**
 * Read a report template's fields as a form this app can draw.
 *
 * Pure: it reads its two arguments, mutates neither, and answers a
 * fresh def tree beside the table it proved that tree against.
 *
 * @param fields - The chosen template's fields in template order,
 * with the screenshot descriptor already withheld.
 * @param actions - The handlers the caller supplies, keyed by id.
 * `{}` is legal for a template offering no selector field.
 * @returns The def tree and the table, as one verified pair.
 * @throws If the field list is empty, if two fields map onto one
 * key, if a field declaring choices arrived with none, or if the
 * table does not hold the id a mapped def names.
 */
export function adaptReportForm(
  fields: readonly ReportFormField[],
  actions: FieldActionTable,
): ReportFormMapping {
  const [head, ...rest] = fields.map(fieldDefOf);

  if (head === undefined) {
    throw new Error(NO_FIELDS);
  }

  const mapped: readonly FieldDef[] = [head, ...rest];

  assertUniqueKeys(mapped);

  const defs: ObjectFieldDef = {
    type: 'object',
    key: REPORT_FORM_ROOT_KEY,
    label: REPORT_FORM_ROOT_LABEL,
    fields: mapped,
  };

  // The same refusal `DynamicForm` raises at mount, taken here so a
  // caller learns about a missing handler from the mapping rather
  // than from a render — see this module's documentation.
  assertActions([defs], actions);

  return { defs, actions };
}
