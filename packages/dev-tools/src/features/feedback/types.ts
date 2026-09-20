/**
 * @packageDocumentation
 * The feedback feature's rendering contract: the `renderForm` SLOT an
 * app may fill, what a slot receives, and the per-field error record
 * the package's own renderer draws into.
 *
 * Three type declarations and nothing else — no value, no component,
 * no import that survives compilation. `./ReportFormFields.tsx` is
 * the package's own implementation of the slot declared here, and
 * `packages/web/src/dev/reportFormAdapter.ts` will be the app's.
 *
 * ## Why the renderer is a slot at all
 *
 * Decision 9 of `.rafa/specs/q20b-2-feedback-feature.md`: the package
 * depends on no design system — that is q20b-1's decision 2 and the
 * reason a tool that has to report a broken stylesheet does not
 * render through one — while `@ar/web` already owns a form renderer
 * (`packages/web/src/dynamic-form/`) that draws in the app's own
 * language. So the package ships a plain-HTML default and takes an
 * app's renderer through `mountDevTools`'s feature options, and the
 * adapter that maps a {@link ReportFormField} onto the app's field
 * descriptor lives in the APP, never here.
 *
 * ## `(fields, values, onChange)` — the three arguments, and why
 * the second and third are a whole record
 *
 * The spec fixes the argument ORDER; what each one carries is this
 * file's reading of it, and the reading is the one that makes the
 * `@ar/web` adapter a mapping rather than a diff.
 * `DynamicFormProps.onChange` in
 * `packages/web/src/dynamic-form/DynamicForm.tsx` is `(next: T) =>
 * void` — a whole value out, never a changed key — so a slot whose
 * `onChange` reported `(id, value)` would force that adapter to
 * compare the record it was handed against the one the form answered
 * and guess which key moved. A whole {@link FeedbackValues} out
 * matches both renderers: the default builds it with one spread per
 * edit, the adapter passes on what `DynamicForm` already built.
 *
 * The record is keyed by field id, which `src/core/reportTemplate.ts`
 * refuses to let two fields of one template share, so a key can name
 * at most one control.
 *
 * ## A `file` field never reaches the slot
 *
 * {@link ReportFormRenderer} takes {@link ReportFormField}, which is
 * every `ReportField` kind but `file` — so handing a slot the
 * screenshot descriptor is a `check-types` refusal rather than a
 * convention a renderer could quietly break.
 *
 * The screenshot control is the FEATURE's own under both renderers:
 * `./DropZone.tsx` draws the capture button, the drop zone, the
 * PNG/JPEG file input, the preview and the one-line notice that the
 * image stays on this machine, and the drawer places it itself. That
 * is what keeps the two renderers' behaviour identical where it
 * matters most — an image that must not leave the machine is handled
 * by one piece of code, not by whichever renderer the host happened
 * to pass. `src/core/reportTemplate.ts` says the same thing from the
 * descriptor's side, on the `file` member of its union.
 *
 * That withholding is measured rather than asserted:
 * `./ReportFormFields.test.ts` opens with a `@ts-expect-error` over
 * an array of {@link ReportFormField} holding the screenshot
 * descriptor. Delete the directive and `check-types` reds with
 * `TS2322 … Type '"file"' is not assignable to type '"selector"'`;
 * widen the type below back to the whole union and it reds with
 * `TS2578: Unused '@ts-expect-error' directive`.
 *
 * The other two fields the widget adds are NOT withheld this way. The
 * `selector` field is drawn by the renderer — both renderers mark its
 * input `data-devtools-field="selector"` (spec item 5) and
 * `./Picker.tsx` attaches the match decoration and the climb keys to
 * whatever element carries that attribute — and `readonly` is how the
 * always-present context block is drawn.
 *
 * ## Why no error record travels through the slot
 *
 * `./submitRules.ts` answers ONE reason per submit — the first of
 * six, by `refuseSubmit`'s documented order — and the drawer speaks
 * it in the `role="status"` region it owns. That is the refusal path
 * under both renderers, and it is deliberately not per-field: a
 * renderer the package does not own cannot be made to draw six
 * messages in six places.
 *
 * {@link ReportFormErrors} is therefore not part of
 * {@link ReportFormRenderer}. It is a prop of the package's OWN
 * renderer, which draws a stable error slot per field, so a caller
 * that does hold a per-field reason has somewhere to put it without
 * widening the contract an app has to satisfy.
 */

import type { FeedbackValues } from './body';
import type { ReportField } from '../../core/reportTemplate';
import type { ReactNode } from 'react';

/**
 * One field a form renderer may be handed: every `ReportField` kind
 * but `file`.
 *
 * Six of the seven, derived from the union rather than listed again,
 * so a kind added to `src/core/reportTemplate.ts` reaches every
 * renderer without an edit here — and so the one kind that is
 * withheld is withheld in exactly one place.
 *
 * A renderer written against the whole `ReportField` union still
 * satisfies {@link ReportFormRenderer}: a function parameter may be
 * wider than the contract's, which is what lets the `@ar/web` adapter
 * map the union it already knows.
 */
export type ReportFormField = Exclude<ReportField, { kind: 'file' }>;

/**
 * A reason per field id, for a renderer that can draw one.
 *
 * Not part of the slot — see this module's documentation. A key that
 * names no drawn field is drawn by nobody, and an `undefined` value
 * means the field is fine, so a caller may keep one record across
 * edits and clear a key rather than delete it.
 */
export type ReportFormErrors
  = Readonly<Record<string, string | undefined>>;

/**
 * The `renderForm` slot: draw these fields, with these answers, and
 * report every edit.
 *
 * Whatever it answers is placed inside the drawer's own `<form>`,
 * between the report-type select above it and the widget's own
 * controls below — so a renderer draws fields and never a form
 * element, a submit control or a heading of its own.
 *
 * @param fields - The chosen template's fields, in template order,
 * with the screenshot descriptor already withheld.
 * @param values - Every answer so far, keyed by field id. A key may
 * be absent and a value may be `undefined`; both mean unanswered.
 * @param onChange - Called with the WHOLE next record on every edit.
 * The caller owns the record; a renderer neither keeps nor mutates
 * the one it was handed.
 * @returns Whatever React should draw for those fields.
 */
export type ReportFormRenderer = (
  fields: readonly ReportFormField[],
  values: FeedbackValues,
  onChange: (next: FeedbackValues) => void,
) => ReactNode;
