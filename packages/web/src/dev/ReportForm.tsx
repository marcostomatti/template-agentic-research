/**
 * @packageDocumentation
 * The app's `renderForm` slot, drawn: `@ar/dev-tools`'s report
 * fields as one `src/dynamic-form/` form, plus the two things a
 * pure mapping cannot do — the handler behind the selector field's
 * action, and the attribute the feature's picker finds that field
 * by.
 *
 * `./reportFormAdapter.ts` maps the FIELDS, `./reportFormValues.ts`
 * maps the ANSWERS and builds the schema, and every decision either
 * of them makes is held flat by a colocated case in a node runner.
 * What is left here is one container element, one layout effect and
 * two DOM lookups: the thin half of this package's two-runner
 * split, proved by the forced Playwright spec rather than by a
 * DOM-testing library.
 *
 * ## Why the selector control is TAGGED from here
 *
 * Spec item 5 of `.rafa/specs/q20b-2-feedback-feature.md`: both
 * renderers mark the selector input
 * `data-devtools-field="selector"`, and
 * `@ar/dev-tools`'s `pickerField.ts` attaches the match outlines,
 * the count badge and the ArrowUp/ArrowDown climb to whatever
 * carries that attribute inside the widget's root. The package's
 * own renderer writes it as a literal on the input it drew. This
 * one cannot: `src/dynamic-form/fieldDef.ts` carries no way to set
 * an attribute, and `LeafControl.tsx` gives its input
 * `id={useId()}`, which nothing outside React can predict.
 *
 * So the attribute is written onto the rendered DOM, and the lookup
 * is keyed on the one thing this app DOES name: the action button's
 * accessible name. `./reportFormAdapter.ts` puts
 * {@link PICK_ELEMENT_ACTION_LABEL} on the selector leaf's action,
 * `useFieldAction.tsx` draws that action as an `IconButton` whose
 * `label` becomes `aria-label`, and that button sits in a row with
 * the control it belongs to — so the button names the group and the
 * labelable control inside it is the field.
 *
 * Three files therefore share one string and no module — the
 * package's query, the package's own renderer, and this file — which
 * is what `pickerField.ts` says in as many words about
 * {@link SELECTOR_FIELD_QUERY}'s two halves. The spec is the
 * contract; the forced e2e is what reads it end to end.
 *
 * ## ... in a layout effect, and then in an observer
 *
 * Before paint, because the decoration is attached by an effect in
 * the drawer's sibling `ElementPicker` and an attribute written a
 * frame later would be read a frame late.
 *
 * The observer is not decoration: `DynamicForm` owns the selected
 * node, so navigating its tree re-renders the form WITHOUT
 * re-rendering this component, and the selector control unmounts
 * with the root node's form and mounts again untagged on the way
 * back. An effect keyed on this component's renders would leave
 * that remounted control unmarked until the next keystroke landed
 * somewhere else. `childList` and `subtree` only: the callback
 * writes an ATTRIBUTE, which is not a mutation this observer is
 * watching for, so it cannot wake itself.
 *
 * ## The warning is once per mount, and only when one is due
 *
 * A lookup that finds nothing is silent by nature — the form still
 * draws, the picker simply decorates nothing — so it says so on the
 * console. Under two conditions, both of which keep it a signal:
 *
 * - Only when the drawn fields include a `selector` field. A
 *   template that opted out of the picker draws none, and the bug
 *   report form is exactly that template, so an unconditional
 *   warning would fire on the commonest report in the app.
 * - Only while nothing has been tagged yet. The layout effect runs
 *   once per mount and the root node's form is what is drawn then,
 *   so the control is there to find; a later navigation is the
 *   observer's business and not a fault to report.
 *
 * `import.meta.env.DEV` guards it anyway. `../main.tsx` only ever
 * imports `./devtools.ts` behind that same flag, so this module is
 * in no production bundle at all — the guard states the rule where
 * a reader of this file can see it, and costs a branch.
 *
 * ## What `pick-element` actually does
 *
 * It presses the feature's own pick control, and that is the whole
 * of it. Starting a pick is `@ar/dev-tools`'s: `startPick` puts a
 * top-layer sheet over the page, COLLAPSES the drawer, and calls
 * back with the selector once an element is clicked — by which time
 * this component is unmounted, so a value answered to
 * `useFieldAction` could reach no field. The package exports none
 * of it either; `@ar/dev-tools/feedback` is types plus
 * `feedbackFeature`, by decision.
 *
 * What the package DOES draw, whenever a template takes a selector
 * field, is `ElementPicker` — the `Pick element` button, the live
 * match count and the climb hint — as a sibling of this form inside
 * the drawer. So the handler finds that control in the widget's
 * root and clicks it, and the picked selector arrives the way it
 * arrives under the package's own renderer: written into the
 * drawer's draft, handed back to this form as a new `values`
 * record. The handler answers nothing, because nothing is what it
 * has to say.
 *
 * That is a coupling on the package's MARKUP rather than on a
 * module of it, in the same direction the attribute above couples
 * the other way. It is narrow and it is loud: a control that is not
 * there is a rejection, and `useFieldAction` draws a rejected
 * action's message in the field's own error slot rather than
 * throwing it.
 *
 * ## Measured, because no unit case can reach this file
 *
 * The unit runner is node-only and collects `.test.ts` alone, so
 * everything above is claimed by a `.tsx` that no case opens. It
 * was read instead through a throwaway probe page mounted over
 * `bun run dev` — this component inside a hand-written
 * `[data-devtools-root]` beside a `.devtools-picker-start` button,
 * which is the drawer's own shape — and driven with Playwright.
 * The probe and its page were deleted; the permanent reading is the
 * forced e2e spec this plan's next stage adds.
 *
 * What it answered, each break restoring this file byte-identical
 * (SHA-256 compared against the original, every leg):
 *
 * - The mark lands on an `INPUT`, one of them, with no console
 *   warning and no page error, and typing into it reaches the
 *   answers record as `devtools-selector`. Renaming the query's
 *   accessible name reads `0` marked controls and exactly one
 *   warning — so the lookup could have failed, and the warning
 *   could have fired.
 * - A template with no selector field marks nothing and warns
 *   nothing. Dropping the `expected` guard makes that same page
 *   warn, which is what that guard is for.
 * - Drilling into the boxes node unmarks the form (`0`) and coming
 *   back through the breadcrumb marks it again (`1`) with no render
 *   of this component in between. Removing the observer leaves the
 *   returning control at `0` while its action button is back — the
 *   silent failure the observer exists to close.
 * - Pressing the action button presses the feature's control once.
 *   Pointing {@link PICK_CONTROL_QUERY} at a class nothing carries
 *   presses nothing and draws `The element picker did not draw ...`
 *   in the field's error slot, with no page error.
 *
 * One reading was not predicted and is recorded rather than fixed:
 * the drawer then holds TWO controls named `Pick element`, this
 * form's action button and the feature's own, doing the same thing.
 * A spec locating one by name has to say which.
 */

import type { FieldActionTable } from '../dynamic-form/actions';
import type { FeedbackValues, ReportFormField } from '@ar/dev-tools/feedback';
import type { ReactElement } from 'react';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';

import { DynamicForm } from '../dynamic-form/DynamicForm';

import {
  PICK_ELEMENT_ACTION_ID,
  PICK_ELEMENT_ACTION_LABEL,
  adaptReportForm,
} from './reportFormAdapter';
import {
  drawsSelectorField,
  reportFormSchema,
  toFeedbackValues,
  toReportFormValue,
} from './reportFormValues';

/**
 * What the structure column calls this form.
 *
 * The tree's accessible name, which `DynamicForm` takes as
 * presentation rather than contract. `Report` is what the root NODE
 * is called — `./reportFormAdapter.ts` owns that — so the column is
 * named for what it navigates instead of repeating it.
 */
const FORM_TREE_LABEL = 'Report fields';

/** The attribute `@ar/dev-tools`'s picker finds the field by. */
const SELECTOR_FIELD_ATTRIBUTE = 'data-devtools-field';

/** ... and the value it looks for on it. */
const SELECTOR_FIELD_VALUE = 'selector';

/**
 * How the selector field's group is found: by its action button.
 *
 * `IconButton` puts its `label` on `aria-label`, so the accessible
 * name the adapter chose is a query. Nothing else this form draws
 * carries an action, and the feature's own pick button is outside
 * this component's container and carries no `aria-label` at all.
 */
const ACTION_BUTTON_QUERY
  = `button[aria-label="${PICK_ELEMENT_ACTION_LABEL}"]`;

/**
 * The labelable controls a field row can hold.
 *
 * `querySelector` answers the first in DOCUMENT order rather than
 * the first kind listed, which is the row's own control: the only
 * other element in that row is the action button, and a button is
 * none of these three.
 */
const FIELD_CONTROL_QUERY = 'input, textarea, select';

/** The widget's own root, which the pick lookup starts from. */
const WIDGET_ROOT_QUERY = '[data-devtools-root]';

/** The feature's pick control, drawn beside this form. */
const PICK_CONTROL_QUERY = '.devtools-picker-start';

/** Said in the field's error slot when that control is not there. */
const PICK_UNAVAILABLE
  = 'The element picker did not draw, so there is nothing to pick '
  + 'with. Close the report and open it again.';

/** ... and said on the console when the field could not be marked. */
const TAGGING_WARNING
  = 'devtools: no control was found to mark '
  + 'data-devtools-field="selector" on, so the element picker will '
  + 'decorate nothing. The report form draws a selector field whose '
  + `action button should be named "${PICK_ELEMENT_ACTION_LABEL}".`;

/**
 * Mark the selector field's control, if it is on screen.
 *
 * Writes the attribute and reads nothing else: an attribute already
 * set is set to the same value, which is what makes this safe to
 * run on every mutation of the form.
 *
 * @param container - This component's own element.
 * @returns Whether a control was found and marked.
 */
function tagSelectorControl(container: HTMLElement): boolean {
  const button = container.querySelector(ACTION_BUTTON_QUERY);
  const group = button?.parentElement ?? null;
  const control = group?.querySelector<HTMLElement>(FIELD_CONTROL_QUERY)
    ?? null;

  if (control === null) {
    return false;
  }

  control.setAttribute(SELECTOR_FIELD_ATTRIBUTE, SELECTOR_FIELD_VALUE);

  return true;
}

/**
 * Press the feature's own pick control.
 *
 * See this module's documentation for why starting a pick is the
 * package's and why this reaches for a button rather than for an
 * export.
 *
 * @param container - This component's own element, or `null` while
 * it has not been attached.
 * @returns Nothing; the selector arrives through the drawer's draft.
 * @throws If the widget's root or the pick control is not there,
 * which `useFieldAction` draws in the field's error slot.
 */
function startFeaturePick(container: HTMLElement | null): void {
  const root = container?.closest(WIDGET_ROOT_QUERY) ?? null;
  const control = root?.querySelector<HTMLElement>(PICK_CONTROL_QUERY)
    ?? null;

  if (control === null) {
    throw new Error(PICK_UNAVAILABLE);
  }

  control.click();
}

/** What the `renderForm` slot hands this component. */
export interface ReportFormProps {
  /**
   * The chosen template's fields, in template order.
   *
   * The screenshot descriptor is already withheld by the feature —
   * it draws its own control for it under either renderer.
   */
  readonly fields: readonly ReportFormField[];

  /** Every answer so far, keyed by field id. */
  readonly values: FeedbackValues;

  /** Called with the WHOLE next record on every accepted edit. */
  readonly onChange: (next: FeedbackValues) => void;
}

/**
 * A report template, drawn as this app's own form.
 *
 * @param props - {@link ReportFormProps}.
 * @returns The provider's two columns, in the container this
 * component holds onto so the selector field can be marked.
 * @throws While rendering, if the template maps onto no field, onto
 * two defs claiming one key, or onto a choice with no option —
 * `./reportFormAdapter.ts` and `./reportFormValues.ts` own all
 * three refusals, and each says something upstream is broken.
 */
export const ReportForm = ({
  fields,
  values,
  onChange,
}: ReportFormProps): ReactElement => {
  // The container is held as STATE behind a callback ref, not in a
  // `useRef`: the action table below closes over it and is read
  // while rendering, which a ref may not be (`react-hooks/refs`,
  // measured — `Passing a ref to a function may read its value
  // during render`). A callback ref costs one extra render at
  // mount, before paint, and nothing after that.
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const tagged = useRef(false);
  const expected = drawsSelectorField(fields);

  // One table per container rather than one per render: it is a
  // prop of every field control below, and the handler needs the
  // element to find the widget's root from.
  const actions: FieldActionTable = useMemo(() => ({
    [PICK_ELEMENT_ACTION_ID]: () => {
      startFeaturePick(container);

      // Nothing to write: the pick ends after this subtree is gone,
      // and its selector reaches the drawer's draft directly.
      return undefined;
    },
  }), [container]);

  useLayoutEffect(() => {
    if (container === null) {
      return undefined;
    }

    const mark = (): void => {
      if (tagSelectorControl(container)) {
        tagged.current = true;
      }
    };

    mark();

    if (expected && !tagged.current && import.meta.env.DEV) {
      console.warn(TAGGING_WARNING);
    }

    // The form redraws without this component re-rendering — see
    // the header — so the mark is kept by watching the subtree.
    const observer = new MutationObserver(mark);

    observer.observe(container, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, [container, expected]);

  const mapping = adaptReportForm(fields, actions);

  return (
    <div ref={setContainer}>
      <DynamicForm
        label={FORM_TREE_LABEL}
        value={toReportFormValue(fields, values)}
        schema={reportFormSchema(fields)}
        defs={mapping.defs}
        actions={mapping.actions}
        onChange={(next) => {
          onChange(toFeedbackValues(fields, values, next));
        }}
      />
    </div>
  );
};
