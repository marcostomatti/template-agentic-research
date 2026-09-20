/**
 * @packageDocumentation
 * The form the drawer draws, and the report it builds out of it —
 * every judgement `./FeedbackDrawer.tsx` would otherwise have had to
 * make while rendering.
 *
 * Pure: it reads its arguments, mutates nothing, reaches no document,
 * no clock and no network. That is what lets the jsdom vitest project
 * collect its cases while the component stays a `.tsx` no project
 * collects — this package's two-runner discipline, stated in
 * `../../vitest.config.ts`.
 *
 * ## Spec decision 2, as a composition
 *
 * "Three fields are the widget's own, appended after the template's:
 * screenshot, element selector, context. A template may opt out of
 * any of them through a top-level `x-devtools` key GitHub ignores;
 * context is always present."
 *
 * {@link composeFeedbackTemplate} is that sentence: it answers the
 * SAME `ReportTemplate` shape with the widget's fields appended,
 * honouring `template.devtools`, which `../../core/reportTemplate.ts`
 * already resolved to `{screenshot, selector, context: true}`. One
 * composed template then feeds all three readers — the renderer slot,
 * the screenshot control and `./body.ts` — so no two of them can
 * disagree about which fields this report has.
 *
 * That last point is the reason the composition is a template rather
 * than three separate lists. `./body.ts`'s `readSelector` looks for a
 * field of kind `selector` in `template.fields` and reads the answer
 * keyed by ITS id; hand the body builder the raw template and the
 * selector the operator picked is silently dropped from the report.
 *
 * ## The three ids carry the package prefix, and that is not cosmetic
 *
 * {@link FEEDBACK_SELECTOR_FIELD_ID} and its two siblings are spelled
 * `devtools-…`. A field id keys the answers record and reaches the DOM
 * as `devtools-field-<id>`, and the template's own ids come from a
 * GitHub issue form somebody else writes: `context` is a plausible id
 * for a "any other context" textarea, and a collision would put two
 * fields with one id in one form — two controls writing one key, two
 * elements sharing one DOM id.
 *
 * The prefix makes that implausible and the filter in
 * {@link composeFeedbackTemplate} makes it impossible: a template
 * field carrying one of the three ids is dropped in favour of the
 * widget's. The colocated case drives exactly that, because a rule
 * nothing reaches is a rule nobody can trust.
 *
 * ## What the drawer does NOT get from here
 *
 * - **The refusals.** `./submitRules.ts` owns all six, and the drawer
 *   asks it directly. Nothing below refuses anything.
 * - **The body.** `./body.ts` builds it from the composed template.
 *   {@link buildFeedbackReport} takes the finished Markdown, so the
 *   drawer can build a body, hand it to `refuseSubmit` for the length
 *   rule, and only then pay for the attachment encoding.
 * - **The picked element's description.** `./ElementPicker.tsx`
 *   reports a SELECTOR and nothing else — its `onSelect` is typed
 *   `(selector: string) => void` — so the drawer never holds the tag,
 *   the text excerpt or the box that `./body.ts`'s `element` argument
 *   would carry. The body therefore names the selector off the field,
 *   which is the fallback that module documents, and the report
 *   carries no `- Element:` or `- Box:` bullet. Written down here
 *   because it reads as a missing feature otherwise.
 *
 * ## Mutation note — what the colocated cases actually catch
 *
 * A green suite is no evidence a case can fail. Each leg below was
 * measured by breaking this file, running `bun x vitest run
 * src/features/feedback/drawerModel.test.ts` from
 * `packages/dev-tools`, and restoring this file byte-identical
 * (SHA-256 compared before and after, every leg). The baseline is
 * `Tests 21 passed (21)`.
 *
 * - Dropping the {@link OWN_FIELD_IDS} filter answers `1 failed | 20
 *   passed`: `drops a template field that took one of the widget's
 *   ids`.
 * - Pushing the widget's fields into `template.fields` and answering
 *   the same object, rather than building a new one, answers `2 failed
 *   | 19 passed`: that case and `leaves the served template
 *   untouched`.
 * - Answering the whole field list from {@link feedbackFormFields},
 *   so the screenshot descriptor reaches the slot, answers `1 failed |
 *   20 passed`: `withholds the screenshot descriptor`.
 * - Appending the screenshot BEFORE the selector answers `1 failed |
 *   20 passed`: `appends the selector, the screenshot and the context
 *   block`, which is the only case that pins the order rather than the
 *   set.
 * - Trimming the title in {@link buildFeedbackReport} answers `1
 *   failed | 20 passed`: `sends the title exactly as typed,
 *   untrimmed`.
 * - Writing `attachments: []` rather than omitting the key answers `1
 *   failed | 20 passed`: `omits attachments entirely when there is no
 *   image`. That case reads with `toStrictEqual`; written with
 *   `toEqual` it would have passed the leg.
 * - Dropping the {@link CONTEXT_EMPTY} fallback answers `1 failed | 20
 *   passed`: `answers a sentence where nothing was collected`.
 * - Reading the selector answer as `(value ?? '') as string` rather
 *   than testing its type answers `1 failed | 20 passed`: `answers an
 *   empty string when the record holds a list`.
 *
 * `bun x tsc --noEmit` exits `0` under ALL EIGHT, measured one by one:
 * every leg is a behaviour change over types that still line up, so
 * `check-types` would never report one and the suite is the only gate
 * that does.
 */

import type { FeedbackFieldValue, FeedbackValues } from './body';
import type { FeedbackContext } from './context';
import type { ReportScreenshotField } from './DropZone';
import type { FeedbackReport, FeedbackReportAttachment } from './submit';
import type { ReportFormField } from './types';
import type { ReportField, ReportTemplate } from '../../core/reportTemplate';

/** The id of the widget's own element-selector field. */
export const FEEDBACK_SELECTOR_FIELD_ID = 'devtools-selector';

/** ...of its screenshot field, which never reaches the slot. */
export const FEEDBACK_SCREENSHOT_FIELD_ID = 'devtools-screenshot';

/** ...and of the always-present context block. */
export const FEEDBACK_CONTEXT_FIELD_ID = 'devtools-context';

/**
 * The three, for the collision filter.
 *
 * Built from the constants rather than respelt, so a renamed field id
 * cannot leave the filter guarding a name nothing uses.
 */
const OWN_FIELD_IDS: readonly string[] = Object.freeze([
  FEEDBACK_SELECTOR_FIELD_ID,
  FEEDBACK_SCREENSHOT_FIELD_ID,
  FEEDBACK_CONTEXT_FIELD_ID,
]);

/** What the selector field is called above the control. */
const SELECTOR_LABEL = 'Element selector';

/** ...and the help under it, which names the control that fills it. */
const SELECTOR_DESCRIPTION
  = 'Which element this is about. Press Pick element to choose one on '
  + 'the page, or type a CSS selector.';

/** ...and the greyed example inside the empty field. */
const SELECTOR_PLACEHOLDER = '[data-testid="tree"] button';

/** What the screenshot control is called. */
const SCREENSHOT_LABEL = 'Screenshot';

/**
 * ...and the help under it.
 *
 * It does NOT repeat that the image stays on this machine:
 * `./DropZone.tsx` draws that sentence itself, as the notice the
 * control's `aria-describedby` names, and one report should not say it
 * twice in two wordings.
 */
const SCREENSHOT_DESCRIPTION
  = 'A frame of what you are looking at, captured, dropped or chosen.';

/** What the read-only context block is titled. */
const CONTEXT_LABEL = 'Context';

/** ...and the line under that title. */
const CONTEXT_DESCRIPTION
  = 'Collected from this page and sent with the report. Nothing here '
  + 'is typed, and nothing here can be edited.';

/** Written into the block when there was nothing at all to collect. */
const CONTEXT_EMPTY = 'Nothing was collected.';

/** How a collected key and its value are written on one line. */
const CONTEXT_SEPARATOR = ': ';

/**
 * Render the collected record as the block's text.
 *
 * One `key: value` per line, in the record's own order — which is the
 * order `./context.ts` merged its sources in — so two reports of one
 * session show their facts the same way round.
 *
 * @param context - What `./context.ts` collected.
 * @returns The text, never empty: a record holding nothing answers
 * {@link CONTEXT_EMPTY}, because `../../core/reportTemplate.ts`
 * refuses a `readonly` field with an empty value and a block that
 * vanished would read as a broken widget rather than as an empty one.
 */
export function describeFeedbackContext(context: FeedbackContext): string {
  const lines = Object.entries(context).map(
    ([key, value]) => `${key}${CONTEXT_SEPARATOR}${String(value)}`,
  );

  return lines.length === 0
    ? CONTEXT_EMPTY
    : lines.join('\n');
}

/**
 * The widget's own fields, in spec decision 2's order.
 *
 * @param template - The template as the dev server served it; its
 * `devtools` block says which of the first two are offered.
 * @param context - What the read-only block shows.
 * @returns Between one and three fields: the selector when the
 * template takes it, the screenshot when it takes that, and the
 * context block always.
 */
function ownFieldsOf(
  template: ReportTemplate,
  context: FeedbackContext,
): readonly ReportField[] {
  const fields: ReportField[] = [];

  if (template.devtools.selector) {
    fields.push({
      id: FEEDBACK_SELECTOR_FIELD_ID,
      kind: 'selector',
      label: SELECTOR_LABEL,
      description: SELECTOR_DESCRIPTION,
      placeholder: SELECTOR_PLACEHOLDER,
      required: false,
    });
  }

  if (template.devtools.screenshot) {
    fields.push({
      id: FEEDBACK_SCREENSHOT_FIELD_ID,
      kind: 'file',
      label: SCREENSHOT_LABEL,
      description: SCREENSHOT_DESCRIPTION,
      required: false,
    });
  }

  fields.push({
    id: FEEDBACK_CONTEXT_FIELD_ID,
    kind: 'readonly',
    label: CONTEXT_LABEL,
    description: CONTEXT_DESCRIPTION,
    value: describeFeedbackContext(context),
  });

  return fields;
}

/**
 * Append the widget's own fields to a served template.
 *
 * @param template - What `GET <endpoint>/templates` answered for the
 * chosen report type.
 * @param context - What `./context.ts` collected, for the read-only
 * block.
 * @returns A new frozen template. The original is untouched, and a
 * template field carrying one of the widget's three ids is dropped in
 * favour of the widget's own — see this module's documentation.
 */
export function composeFeedbackTemplate(
  template: ReportTemplate,
  context: FeedbackContext,
): ReportTemplate {
  const declared = template.fields.filter(
    (field) => !OWN_FIELD_IDS.includes(field.id),
  );

  return Object.freeze({
    ...template,
    fields: [...declared, ...ownFieldsOf(template, context)],
  });
}

/**
 * The fields the renderer slot is handed.
 *
 * @param template - The COMPOSED template.
 * @returns Every field but the screenshot descriptor, in order.
 * `./types.ts` withholds `file` from the slot at the type level, and
 * this is the value side of that withholding: the descriptor is
 * filtered out here, so a renderer is never handed one to ignore.
 */
export function feedbackFormFields(
  template: ReportTemplate,
): readonly ReportFormField[] {
  return template.fields.filter(
    (field): field is ReportFormField => field.kind !== 'file',
  );
}

/**
 * The screenshot descriptor, for the feature's own control.
 *
 * @param template - The COMPOSED template.
 * @returns The `file` field, or `null` where the template opted out
 * of the screenshot and the drawer draws no `./DropZone.tsx`.
 */
export function feedbackScreenshotField(
  template: ReportTemplate,
): ReportScreenshotField | null {
  const found = template.fields.find(
    (field): field is ReportScreenshotField => field.kind === 'file',
  );

  return found ?? null;
}

/**
 * Read the selector field's answer as text.
 *
 * @param values - Every answer the form holds.
 * @returns What was typed, picked or climbed to, or `''` when the
 * field is unanswered — or when it holds a list, which a `selector`
 * field cannot but the record's type allows.
 */
export function feedbackSelectorValue(values: FeedbackValues): string {
  const value: FeedbackFieldValue | undefined
    = values[FEEDBACK_SELECTOR_FIELD_ID];

  return typeof value === 'string'
    ? value
    : '';
}

/** Everything {@link buildFeedbackReport} reads, in one argument. */
export interface FeedbackReportInput {
  /** The id the feature is registered under. */
  readonly feature: string;

  /** The title as typed, unchanged — see {@link buildFeedbackReport}. */
  readonly title: string;

  /** The Markdown `./body.ts` built from the composed template. */
  readonly body: string;

  /** The flat record `./context.ts` collected at submit time. */
  readonly context: FeedbackContext;

  /** The encoded screenshot, or `null` when there is none. */
  readonly attachment: FeedbackReportAttachment | null;
}

/**
 * Assemble the body of `POST <endpoint>/report`.
 *
 * The title is sent EXACTLY as typed, untrimmed: `./submitRules.ts`
 * reads emptiness off the trimmed text and the length off the text as
 * given, "because that is what will be sent", and a builder that
 * trimmed here would make that sentence false.
 *
 * @param input - {@link FeedbackReportInput}.
 * @returns The frozen report. `attachments` is OMITTED rather than
 * carried as an empty list or as `undefined` when there is no image —
 * `src/vite/report.ts` types it optional, and the colocated case reads
 * the absence with `toStrictEqual`, which tells the two apart.
 */
export function buildFeedbackReport(
  input: FeedbackReportInput,
): FeedbackReport {
  const report: FeedbackReport = {
    feature: input.feature,
    title: input.title,
    body: input.body,
    context: input.context,
  };

  return input.attachment === null
    ? Object.freeze(report)
    : Object.freeze({ ...report, attachments: [input.attachment] });
}
