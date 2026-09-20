/**
 * @packageDocumentation
 * The package's own form renderer: every `ReportField` kind the slot
 * may carry, drawn as plain HTML with its label, its description and
 * an error slot.
 *
 * This is the default implementation of `./types.ts`'s
 * {@link ReportFormRenderer}. It is what the widget draws when
 * `mountDevTools`'s feature options carry no `renderForm`, which is
 * every port of this package and every app that has no form renderer
 * of its own; `@ar/web` passes an adapter over its `DynamicForm`
 * instead, and the two must agree about the DOM the rest of the
 * feature reaches into.
 *
 * It draws fields and nothing around them: no `<form>`, no submit
 * control, no heading, no screenshot control. The drawer owns all
 * four, which is what lets an app's renderer replace this one without
 * replacing the feature.
 *
 * ## Plain HTML is the requirement, not a placeholder
 *
 * q20b-1's decision 2 is that the package depends on no design
 * system: a tool that has to report a broken stylesheet must not
 * render through one. So every control below is the bare element —
 * `input`, `textarea`, `select`, `input type=checkbox` in a
 * `fieldset` — and the drawing leans on the user agent's own
 * defaults.
 *
 * That is measurable rather than rhetorical: `../../styles.css`
 * carries no rule for any class this file writes (`grep -c
 * devtools-field src/styles.css` answers `0`), and its scope reset
 * restyles `button` alone, so an `input`, a `select`, a `textarea`
 * and a `fieldset` inside `[data-devtools-root]` keep the user
 * agent's border, padding and font. The two consequences worth
 * naming, because they are why the markup is shaped the way it is:
 *
 * - A `readonly` value is drawn in a `<pre>`. The always-present
 *   context block is line-per-fact text, and `<pre>` is the one
 *   element that keeps its newlines with no stylesheet at all; a
 *   `<p>` would collapse the block into a paragraph.
 * - A `textarea` carries {@link TEXTAREA_ROWS}. The user agent's
 *   default is two rows, which is too small to write steps to
 *   reproduce into, and `rows` is a content attribute rather than a
 *   style — a stylesheet that later sets a height overrides it
 *   without this file changing.
 *
 * The one thing the widget's stylesheet does reach these controls
 * with is `[data-devtools-root] :focus-visible`, which draws the
 * accent outline on whatever inside the root takes focus.
 *
 * ## Six kinds, and the seventh that draws NOTHING
 *
 * `./types.ts` withholds `file` from the slot at the type level, so a
 * caller that goes through `ReportFormRenderer` cannot hand one over.
 * The `case 'file'` below is what an UNTYPED caller meets, and it
 * draws nothing at all — not a label, not a wrapper, not a control.
 *
 * That is a safety property rather than tidiness. The screenshot is
 * the one piece of a report that must never leave the machine (spec
 * decision 4), `./DropZone.tsx` is the single control that accepts
 * one, and a renderer that drew a second file input would be a second
 * path into the same attachment list — one the feature's own size and
 * mime refusals in `./submitRules.ts` never saw.
 *
 * ## The three parts of a field, and the ids that tie them together
 *
 * Every drawn field is a label, an optional description, the control
 * and an error slot, in that order, with ids derived from the field
 * id: `devtools-field-<id>` for the control, `…-description` and
 * `…-error` beside it. The field id is an identifier
 * (`src/core/reportTemplate.ts` refuses anything else) and is unique
 * within a template (the same file refuses a repeat), so the three
 * ids are unique within the document the widget shares with the app —
 * the `devtools-field-` prefix is what keeps them out of the app's
 * own id space.
 *
 * The error slot is drawn ALWAYS and is empty when there is no
 * reason, and `aria-describedby` names it always. A slot that
 * appeared and vanished would change the control's description
 * relationship as the person types, and a stable empty element
 * describes nothing while it is empty.
 *
 * ## `aria-required`, and never the native `required`
 *
 * A required field is marked `aria-required` and carries no `required`
 * content attribute. The refusal vocabulary of this feature is
 * `./submitRules.ts`'s — one reason per submit, the first of six, in
 * a documented order — and the drawer speaks it in the `role="status"`
 * region it owns. A native `required` would let the user agent block
 * the submit event first and say something the package neither wrote
 * nor can translate, and the one refusal a person actually meets (an
 * empty title) would never reach the line the forced e2e reads.
 *
 * ## `data-devtools-field="selector"`
 *
 * Spec item 5: both renderers mark the selector input with it, and
 * `./Picker.tsx` attaches the match outline, the match count and the
 * ArrowUp/ArrowDown climb to the element carrying that attribute
 * rather than to a control it drew itself. It is written here as a
 * literal for the same reason it is written literally in the
 * `@ar/web` adapter: the string is the contract between two renderers
 * that share no module.
 *
 * ## Option keys and option ids come off the INDEX
 *
 * `src/core/reportTemplate.ts` refuses two FIELDS that share an id and
 * does not refuse two OPTIONS that share a value — measured: its
 * `options` arrays carry `.min`/`.max` and no uniqueness refinement.
 * So a checkbox's `id`, and the React `key` of both a checkbox and an
 * `<option>`, are built from the position, and a template repeating
 * an option value still draws one label per box with one id each.
 *
 * ## What proves what
 *
 * `./ReportFormFields.test.ts` renders this component through
 * `react-dom/server` and reads the markup back through jsdom: the
 * kinds, the ids, the described-by pair, the error slot, the absence
 * of a native `required`, the selector attribute and the file field
 * that draws nothing. What it deliberately does NOT drive is a
 * KEYSTROKE — this package's two-runner discipline puts interaction
 * in the forced Playwright spec, so `onChange`, the checkbox toggle
 * and the select's unchosen option are proved there and not against
 * jsdom's approximation of a browser.
 *
 * ## Mutation note — what those cases actually catch
 *
 * A green suite is no evidence a case can fail. Each leg below was
 * measured by breaking this file, running `bun x vitest run
 * src/features/feedback/ReportFormFields.test.ts` from
 * `packages/dev-tools`, and restoring this file byte-identical
 * (sha256 compared before and after). The baseline is `Tests 24
 * passed (24)`.
 *
 * - Dropping `data-devtools-field` from the input answers `2 failed
 *   | 22 passed` — both cases of `the selector field`. Spec item 5
 *   is the one contract this renderer shares with an app's, so it
 *   rests on two cases rather than one.
 * - Dropping the `case 'file'` branch, which sends the screenshot
 *   descriptor into a text control instead, answers `2 failed | 22
 *   passed` — `draws nothing at all for a file field handed in
 *   untyped` and `draws the fields around a file field and not the
 *   file field`.
 * - Writing `required` where the shared props write `aria-required`
 *   answers `1 failed | 23 passed` — `draws a native required
 *   attribute for no field`.
 * - Dropping the leading unchosen `<option>` answers `2 failed | 22
 *   passed` — `leads with an unchosen option carrying no value` and
 *   `draws one option per declared choice, in order`.
 * - Drawing a `readonly` value in a `<p>` rather than a `<pre>`
 *   answers `2 failed | 22 passed` — both cases of `a readonly
 *   field`. The text is identical in either element; what reds is
 *   the query for the element that keeps the newlines.
 * - Drawing the error slot only when there IS a reason answers `1
 *   failed | 23 passed` — `draws the error slot empty and the
 *   control valid with no reason`.
 * - Dropping `rows` from the textarea answers `1 failed | 23
 *   passed` — `draws four rows rather than the user agent's two`.
 *
 * The `file` refusal has a second, compile-time leg that the suite
 * cannot show: `./ReportFormFields.test.ts`'s first case is a
 * `@ts-expect-error` over an array of `ReportFormField`. Deleting
 * that directive reds `check-types` with `TS2322 … Type '"file"' is
 * not assignable to type '"selector"'`, and widening
 * `ReportFormField` back to the whole union reds it with `TS2578:
 * Unused '@ts-expect-error' directive` — so the type is doing the
 * withholding, and the case would notice if it stopped.
 */

import type { FeedbackFieldValue, FeedbackValues } from './body';
import type { ReportFormErrors, ReportFormField } from './types';
import type { ReportField } from '../../core/reportTemplate';
import type { ReactElement } from 'react';

/** What every id this file writes starts with. */
const FIELD_ID_PREFIX = 'devtools-field-';

/** …and what the description element's id ends with. */
const DESCRIPTION_SUFFIX = '-description';

/** …and the error slot's. */
const ERROR_SUFFIX = '-error';

/** …and what separates a checkbox's id from its position. */
const OPTION_INFIX = '-option-';

/**
 * How tall a `textarea` is drawn.
 *
 * Four rather than the user agent's two; see this module's header.
 */
const TEXTAREA_ROWS = 4;

/** What a `select` reads while nothing has been chosen. */
const SELECT_UNCHOSEN_LABEL = 'Choose one';

/** …and what it submits then: nothing, like an untouched control. */
const SELECT_UNCHOSEN_VALUE = '';

/** A field drawn with one label and one control beside it. */
type ReportControlField = Exclude<
  ReportFormField,
  { kind: 'checkboxes' } | { kind: 'readonly' }
>;

/** The boxes: one label over several controls. */
type ReportCheckboxesField = Extract<ReportFormField, { kind: 'checkboxes' }>;

/** Text that is shown and never edited. */
type ReportReadonlyField = Extract<ReportFormField, { kind: 'readonly' }>;

/**
 * Read one answer as the text a single-value control shows.
 *
 * @param value - Whatever the record held for the field.
 * @returns The text, or the empty string where the field is
 * unanswered — or where it holds a LIST, which a single-value control
 * cannot show and which no drawer of this feature produces. Drawing
 * the empty string keeps the control a controlled one; throwing over
 * a shape a caller could not have produced would take down the
 * widget's React root.
 */
function textOf(value: FeedbackFieldValue | undefined): string {
  if (typeof value === 'string') {
    return value;
  }

  return '';
}

/**
 * Read one answer as the list of ticked values.
 *
 * @param value - Whatever the record held for the field.
 * @returns The list, or an empty one where the field is unanswered or
 * holds a single value; see {@link textOf} for why a mismatch is
 * drawn as empty rather than thrown over.
 */
function listOf(value: FeedbackFieldValue | undefined): readonly string[] {
  if (value === undefined || typeof value === 'string') {
    return [];
  }

  return value;
}

/**
 * Tick or untick one value, without touching the list given.
 *
 * @param ticked - What is ticked now.
 * @param value - The box that moved.
 * @param next - Whether it is ticked after the move.
 * @returns A new list; ticking appends, so the order is the order the
 * boxes were ticked in.
 */
function toggled(
  ticked: readonly string[],
  value: string,
  next: boolean,
): readonly string[] {
  if (!next) {
    return ticked.filter((entry) => entry !== value);
  }

  if (ticked.includes(value)) {
    return ticked;
  }

  return [...ticked, value];
}

/**
 * What a field's control is described by.
 *
 * @param field - The field being drawn.
 * @returns The error slot's id, preceded by the description's where
 * the template wrote one. Both are named always; see this module's
 * header for why the error slot is not conditional.
 */
function describedBy(field: ReportFormField): string {
  const errorId = `${FIELD_ID_PREFIX}${field.id}${ERROR_SUFFIX}`;

  if (field.description === undefined) {
    return errorId;
  }

  return `${FIELD_ID_PREFIX}${field.id}${DESCRIPTION_SUFFIX} ${errorId}`;
}

/** What {@link FieldDescription} takes. */
interface FieldDescriptionProps {
  /** The field whose description is drawn, if it wrote one. */
  readonly field: ReportFormField;
}

/**
 * The help text under a label.
 *
 * @param props - {@link FieldDescriptionProps}.
 * @returns The paragraph, or `null` where the template wrote none.
 */
function FieldDescription({ field }: FieldDescriptionProps): ReactElement | null {
  if (field.description === undefined) {
    return null;
  }

  return (
    <p
      className="devtools-field-description"
      id={`${FIELD_ID_PREFIX}${field.id}${DESCRIPTION_SUFFIX}`}
    >
      {field.description}
    </p>
  );
}

/** What {@link FieldError} takes. */
interface FieldErrorProps {
  /** The field whose slot this is. */
  readonly field: ReportFormField;

  /** The reason, when the caller holds one for this field. */
  readonly error?: string;
}

/**
 * The error slot: always drawn, empty until there is a reason.
 *
 * Carries no `role` and no live region of its own — the drawer's
 * `role="status"` line is where a refusal is SPOKEN, and this slot is
 * where the control's description points.
 *
 * @param props - {@link FieldErrorProps}.
 * @returns The slot.
 */
function FieldError({ field, error }: FieldErrorProps): ReactElement {
  return (
    <p
      className="devtools-field-error"
      id={`${FIELD_ID_PREFIX}${field.id}${ERROR_SUFFIX}`}
    >
      {error}
    </p>
  );
}

/** What {@link FieldControl} takes. */
interface FieldControlProps {
  /** The field being drawn. */
  readonly field: ReportControlField;

  /** Its answer so far. */
  readonly value: FeedbackFieldValue | undefined;

  /** Whether the caller holds a reason for this field. */
  readonly invalid: boolean;

  /** Called with the control's next text. */
  readonly onChange: (next: string) => void;
}

/**
 * The one control of a labelled field.
 *
 * @param props - {@link FieldControlProps}.
 * @returns The control, one bare element per kind.
 */
function FieldControl({
  field,
  value,
  invalid,
  onChange,
}: FieldControlProps): ReactElement {
  // Everything four controls share, so a change to the described-by
  // pair or to the required marking cannot reach three of them and
  // miss the fourth.
  const shared = {
    id: `${FIELD_ID_PREFIX}${field.id}`,
    className: 'devtools-field-control',
    'aria-describedby': describedBy(field),
    'aria-required': field.required,
    'aria-invalid': invalid,
  };

  if (field.kind === 'textarea') {
    return (
      <textarea
        {...shared}
        rows={TEXTAREA_ROWS}
        placeholder={field.placeholder}
        // A fenced answer is code, and a spell checker underlining a
        // stack trace helps nobody.
        spellCheck={field.render === undefined}
        value={textOf(value)}
        onChange={(event) => { onChange(event.target.value); }}
      />
    );
  }

  if (field.kind === 'select') {
    return (
      <select
        {...shared}
        value={textOf(value)}
        onChange={(event) => { onChange(event.target.value); }}
      >
        {/* First, and always present: a chosen option can be given
            back, and a control whose value matches no option would
            show its first entry while holding nothing. */}
        <option value={SELECT_UNCHOSEN_VALUE}>{SELECT_UNCHOSEN_LABEL}</option>

        {field.options.map((option, index) => (
          <option key={`${index}${OPTION_INFIX}${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  // Spec item 5: `./Picker.tsx` finds the field by this attribute,
  // under both renderers. A `text` field carries none: an attribute
  // written as `undefined` is left out of the markup entirely.
  const selectorMark = field.kind === 'selector'
    ? 'selector'
    : undefined;

  return (
    <input
      {...shared}
      type="text"
      data-devtools-field={selectorMark}
      placeholder={field.placeholder}
      value={textOf(value)}
      onChange={(event) => { onChange(event.target.value); }}
    />
  );
}

/** What every row component takes. */
interface FieldRowProps {
  /** Every answer so far; a row hands the whole record back. */
  readonly values: FeedbackValues;

  /** The reason the caller holds for this field, if any. */
  readonly error?: string;

  /** Called with the whole next record. */
  readonly onChange: (next: FeedbackValues) => void;
}

/** What {@link ControlFieldRow} takes. */
interface ControlFieldRowProps extends FieldRowProps {
  /** The field being drawn. */
  readonly field: ReportControlField;
}

/**
 * A label, its description, one control and the error slot.
 *
 * @param props - {@link ControlFieldRowProps}.
 * @returns The row.
 */
function ControlFieldRow({
  field,
  values,
  error,
  onChange,
}: ControlFieldRowProps): ReactElement {
  return (
    <div className="devtools-field">
      <label
        className="devtools-field-label"
        htmlFor={`${FIELD_ID_PREFIX}${field.id}`}
      >
        {field.label}
      </label>

      <FieldDescription field={field} />

      <FieldControl
        field={field}
        value={values[field.id]}
        invalid={error !== undefined}
        onChange={(next) => { onChange({ ...values, [field.id]: next }); }}
      />

      <FieldError field={field} error={error} />
    </div>
  );
}

/** What {@link CheckboxesFieldRow} takes. */
interface CheckboxesFieldRowProps extends FieldRowProps {
  /** The field being drawn. */
  readonly field: ReportCheckboxesField;
}

/**
 * One legend over several boxes.
 *
 * A `fieldset` rather than a `div` with a label, because the boxes
 * are several controls under one question and that is the element the
 * platform has for it: the legend names the group with no ARIA at
 * all.
 *
 * The group's own `required` is not drawn. GitHub declares
 * requiredness per BOX on a `checkboxes` item, each box carries its
 * own `aria-required` below, and a group has no ARIA state for "at
 * least one of these" to map onto.
 *
 * @param props - {@link CheckboxesFieldRowProps}.
 * @returns The row.
 */
function CheckboxesFieldRow({
  field,
  values,
  error,
  onChange,
}: CheckboxesFieldRowProps): ReactElement {
  const ticked = listOf(values[field.id]);

  return (
    <fieldset className="devtools-field" aria-describedby={describedBy(field)}>
      <legend className="devtools-field-label">{field.label}</legend>

      <FieldDescription field={field} />

      <div className="devtools-field-options">
        {field.options.map((option, index) => {
          const optionId = `${FIELD_ID_PREFIX}${field.id}${OPTION_INFIX}${index}`;

          return (
            <div
              className="devtools-field-option"
              key={`${index}${OPTION_INFIX}${option.value}`}
            >
              <input
                type="checkbox"
                id={optionId}
                checked={ticked.includes(option.value)}
                aria-required={option.required}
                aria-invalid={error !== undefined}
                onChange={(event) => {
                  onChange({
                    ...values,
                    [field.id]: toggled(
                      ticked,
                      option.value,
                      event.target.checked,
                    ),
                  });
                }}
              />

              <label htmlFor={optionId}>{option.label}</label>
            </div>
          );
        })}
      </div>

      <FieldError field={field} error={error} />
    </fieldset>
  );
}

/** What {@link ReadonlyFieldRow} takes. */
interface ReadonlyFieldRowProps {
  /** The field being drawn. */
  readonly field: ReportReadonlyField;

  /** The reason the caller holds for this field, if any. */
  readonly error?: string;
}

/**
 * Text that is shown and never edited: a `markdown` block from the
 * template, or the widget's always-present context block.
 *
 * The heading is an `h3` because the drawer's own title is an `h2`
 * (`src/core/surfaces/Drawer.tsx` draws it), and a `markdown` block
 * carries no label at all — `src/core/reportTemplate.ts` makes the
 * label optional for this kind alone — so the heading is drawn only
 * when there is one.
 *
 * @param props - {@link ReadonlyFieldRowProps}.
 * @returns The row.
 */
function ReadonlyFieldRow({
  field,
  error,
}: ReadonlyFieldRowProps): ReactElement {
  return (
    <section className="devtools-field">
      {field.label !== undefined && (
        <h3 className="devtools-field-label">{field.label}</h3>
      )}

      <FieldDescription field={field} />

      <pre className="devtools-field-readonly">{field.value}</pre>

      <FieldError field={field} error={error} />
    </section>
  );
}

/** What {@link FieldRow} takes. */
interface FieldRowDispatchProps extends FieldRowProps {
  /**
   * The field being drawn.
   *
   * The WHOLE union rather than `ReportFormField`, so the `file`
   * branch below is reachable for a caller that arrived without
   * types; see this module's header.
   */
  readonly field: ReportField;
}

/**
 * One field, drawn as its kind asks.
 *
 * @param props - {@link FieldRowDispatchProps}.
 * @returns The row, or `null` for the screenshot descriptor, which
 * this renderer never draws.
 */
function FieldRow({
  field,
  values,
  error,
  onChange,
}: FieldRowDispatchProps): ReactElement | null {
  switch (field.kind) {
    case 'readonly':
      return <ReadonlyFieldRow field={field} error={error} />;

    case 'checkboxes':
      return (
        <CheckboxesFieldRow
          field={field}
          values={values}
          error={error}
          onChange={onChange}
        />
      );

    case 'file':
      return null;

    default:
      return (
        <ControlFieldRow
          field={field}
          values={values}
          error={error}
          onChange={onChange}
        />
      );
  }
}

/** What {@link ReportFormFields} takes. */
export interface ReportFormFieldsProps {
  /** The chosen template's fields, in template order. */
  readonly fields: readonly ReportFormField[];

  /** Every answer so far, keyed by field id. */
  readonly values: FeedbackValues;

  /**
   * A reason per field id, for a caller that holds one.
   *
   * Not part of `./types.ts`'s {@link ReportFormRenderer} — see that
   * module for why the feature's refusals are one line in the
   * drawer's `role="status"` region rather than six slots.
   */
  readonly errors?: ReportFormErrors;

  /** Called with the WHOLE next record on every edit. */
  readonly onChange: (next: FeedbackValues) => void;
}

/**
 * The package's default form renderer.
 *
 * Answers a fragment of one row per field, in the order given: the
 * drawer owns the `<form>` these sit in, so this component draws no
 * element of its own around them.
 *
 * @param props - {@link ReportFormFieldsProps}.
 * @returns One row per field, the screenshot descriptor excepted.
 */
export function ReportFormFields({
  fields,
  values,
  errors,
  onChange,
}: ReportFormFieldsProps): ReactElement {
  return (
    <>
      {fields.map((field) => (
        <FieldRow
          key={field.id}
          field={field}
          values={values}
          error={errors?.[field.id]}
          onChange={onChange}
        />
      ))}
    </>
  );
}
