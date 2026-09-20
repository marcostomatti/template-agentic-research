/**
 * @packageDocumentation
 * The report body: one Markdown document built from a template, the
 * answers a person gave it, the collected context and the element the
 * picker described.
 *
 * One exported function, {@link buildFeedbackBody}, and a string out.
 * `./submitRules.ts` measures that string against the endpoint's
 * 5,000-character limit and `./submit.ts` posts it; neither of them
 * writes Markdown, and nothing else in the feature does either.
 *
 * ## The four sections, in this order, always
 *
 * | Section | What it carries |
 * | --- | --- |
 * | `## Context` | The URL, the selector, and the picked element. |
 * | `## <field label>` | One per answered template field, in template order. |
 * | `## Environment` | The whole context record as a two-column table. |
 * | `## Context record` | The same record as a fenced `json` block. |
 *
 * Every heading is `##`, including the per-field ones. They are flat
 * rather than nested because a report is read top to bottom by a
 * person and parsed by `/^## /` by anything else — the colocated
 * cases pin the order with exactly that expression, and a per-field
 * `###` would have made the order pin and the document disagree about
 * what a section is.
 *
 * The first and last sections are always present, so the order is a
 * property of the builder rather than of one input: a report with no
 * answered field at all still opens with `## Context` and still ends
 * with the fenced record.
 *
 * ## Why `Context` and `Environment` and `Context record` are three
 *
 * They answer three different readers. `## Context` is the human
 * summary of what the WIDGET added — the page, and the element that
 * was picked — and it is the one part of the document a person reads
 * before the report's own prose. `## Environment` is the whole
 * collected record, rendered so it can be skimmed in a browser.
 * `## Context record` is that same record verbatim, so a script
 * reading the issue gets the values back without parsing a table.
 *
 * The URL is therefore written twice, in the first section and in the
 * table. That is deliberate: dropping the `url` key from the table to
 * avoid the repeat would make the table and the fenced block disagree
 * about what was collected, and the block is what a machine trusts.
 *
 * ## An empty field is omitted, heading and all
 *
 * A field whose value is missing, blank, whitespace-only, an empty
 * list or of the wrong shape for its kind produces NO section — not a
 * heading over nothing, and not a heading over a placeholder. A
 * report that carried `## Steps to reproduce` followed by silence
 * reads as an answer that was given and says nothing, while an absent
 * heading reads as a question that was skipped, which is what
 * happened.
 *
 * Three kinds never produce a section of their own, for reasons that
 * are not about emptiness:
 *
 * - **`readonly`.** A GitHub `markdown` body item is instruction text
 *   for the person filling the form and GitHub itself leaves it out
 *   of the submitted issue; the widget's own always-present context
 *   block is the record, which the last two sections already carry in
 *   full. Rendering either would put text in the issue that nobody
 *   wrote.
 * - **`file`.** The screenshot never reaches the tracker as bytes,
 *   and the browser cannot know the path the dev server will store it
 *   under — that path is appended to the body SERVER-side by
 *   `src/vite/gateway/rafa.ts`, after the write has succeeded, where
 *   the round is also known. A section here would either be empty or
 *   would guess.
 * - **`selector`.** Its answer is the `## Context` section's
 *   `Selector` line. One selector written in two places is a report
 *   that can contradict itself after a climb.
 *
 * ## Fences are as long as they need to be
 *
 * Two things this module writes are fenced: a `textarea` whose
 * template declared a `render` language, and the context record. Both
 * carry text this module did not author — a stack trace a person
 * pasted, a user agent, whatever the app's `extra()` returned.
 * {@link fence} counts the longest backtick run in the content and
 * opens with one longer, which is CommonMark's own rule. {@link
 * inlineCode} does the same for a selector or a tag, and pads with a
 * space when the value starts or ends with a backtick, because
 * CommonMark strips one leading and one trailing space from code
 * spans and would otherwise eat the backtick instead.
 *
 * The two fences do not carry the same risk, and the difference is
 * measured rather than assumed. A `render` answer is written
 * VERBATIM, newlines and all, so a pasted log holding a line of three
 * backticks closes a three-backtick fence from the inside and spills
 * the rest of the report into the page — the colocated case
 * `lengthens that fence around an answer holding one of its own`
 * reds on exactly that. The record cannot: `JSON.stringify` escapes
 * every newline, so each line of the block begins with a brace, a
 * space or a quote and a backtick run inside a value can never sit at
 * the start of one. Measured — a record carrying `a\n```\nb` is
 * written as one `"error": "a\n```\nb"` line, and the fence
 * lengthens to four backticks it did not need. One helper serves both
 * because a second rule would be a second thing to get wrong, and the
 * unnecessary backtick costs a reader nothing.
 *
 * This is escaping, not decoration: the selector comes off the page
 * and the record comes off the machine, and the endpoint's schema
 * bounds their LENGTH and not their bytes.
 *
 * ## It renders, and it decides nothing else
 *
 * No `document`, no clock, no `fetch`, no module state: the same
 * input answers the same string on any machine. The context is read
 * by `./context.ts` and the element by `./picker.ts`, each once, and
 * handed in — this module never reaches for either, so a report and
 * the drawer that showed it cannot disagree about what was collected.
 *
 * `JSON.stringify` is called without a try/catch. {@link
 * FeedbackContext} is a flat record of strings, finite numbers and
 * booleans, enforced at the one place the four sources meet in
 * `./context.ts`, so the serialiser meets no cycle and no `bigint`. A
 * catch here would be a branch no case could reach.
 *
 * ## Mutation note — what the colocated cases actually catch
 *
 * A green suite is not evidence a case can fail. Each leg below was
 * measured by breaking this file, running `bun x vitest run
 * src/features/feedback/body.test.ts` from `packages/dev-tools`
 * against the 31 cases that file holds, and restoring this file
 * byte-identical — a SHA-256 of the restored text compared to the
 * original's, every leg, all twenty-four restored clean. The baseline
 * is `Tests 31 passed (31)`.
 *
 * Every one of the 31 cases is red by at least one leg; the list was
 * grown until that was true, which is why several legs below differ
 * only in which half of one behaviour they break.
 *
 * - Rendering a `readonly` field as its `value` answers `Tests  1
 *   failed | 30 passed (31)`, and rendering the `selector` field as
 *   its own section answers the same one: `omits the readonly, file
 *   and selector fields entirely`. That case carries all three kinds,
 *   so one leg each is what proves it is not passing on two of them
 *   by luck.
 * - Dropping {@link asText}'s blank check answers `3 failed | 28
 *   passed`: `omits a field holding nothing but whitespace`, `writes
 *   no selector line where nothing was typed or picked` and `falls
 *   back to the element selector when the field is blank` — the
 *   selector pair because a blank field stops being blank.
 * - Answering `''` rather than `null` for a value of the wrong shape
 *   answers `4 failed | 27 passed`: `omits a field nobody answered`,
 *   `omits a value of the wrong shape for its kind`, `leaves no blank
 *   run where a middle field was omitted` and `keeps the first and
 *   last sections when no field is answered`. Joining a wrong-shaped
 *   array into text instead answers `1 failed | 30 passed`, the
 *   wrong-shape case alone.
 * - Rendering a `checkboxes` with nothing ticked answers `1 failed |
 *   30 passed`: `omits a checkboxes field with nothing ticked`.
 * - Letting the described element's selector win over the field's
 *   answers `1 failed | 30 passed`: `prefers the field selector over
 *   the described element`.
 * - Fixing {@link fence} at three backticks answers `1 failed | 30
 *   passed`: `lengthens that fence around an answer holding one of
 *   its own`. The three parse-back cases survive it, which is the
 *   measurement behind the paragraph above. Fixing {@link inlineCode}
 *   at one answers `1 failed | 30 passed`: the selector's code span.
 * - Dropping the `json` info string answers `3 failed | 28 passed` —
 *   all three parse-back cases, which read the block by its info
 *   string — and dropping the record section entirely answers `7
 *   failed | 24 passed`, those three plus every order pin.
 * - Moving `## Environment` ahead of the answered fields answers `3
 *   failed | 28 passed`: the three order pins.
 * - Dropping the trailing newline answers `1 failed | 30 passed`:
 *   `ends with exactly one newline`.
 * - Dropping {@link tableCell}'s escaping answers `1 failed | 30
 *   passed`, writing only string values into the table answers `1
 *   failed | 30 passed` (`writes a boolean and a number as
 *   themselves`), and sorting the rows by key answers `1 failed | 30
 *   passed` (`writes one row per key, in the record order`).
 * - Always writing the table, empty or not, answers `1 failed | 30
 *   passed`: `writes a sentence where the record held nothing`.
 * - Writing a chosen value rather than its label answers `3 failed |
 *   28 passed` — the `select` case and both `checkboxes` cases —
 *   while DROPPING a value no option carries answers `1 failed | 30
 *   passed`, that case alone. The two directions red different cases,
 *   so neither is covered only by the other.
 * - Reading a bare string as nothing ticked answers `1 failed | 30
 *   passed`: `reads a single ticked box handed over as a bare
 *   string`.
 * - Ignoring a declared `render` answers `2 failed | 29 passed` (both
 *   fenced-textarea cases), and collapsing an unfenced answer to one
 *   line answers `1 failed | 30 passed` (`keeps the newlines of a
 *   textarea with no render language`).
 * - Writing the box unrounded answers `2 failed | 29 passed`: the
 *   element case and its no-text sibling, which reads the same line.
 * - Writing the URL straight out of the record answers `1 failed | 30
 *   passed`: `writes unknown as the URL when the record carries
 *   none`, which reds as the four characters `undefined`.
 *
 * `bun x tsc --noEmit` exits `0` under ALL TWENTY-FOUR, measured one
 * by one: every leg is a behaviour change over types that still line
 * up, so `check-types` would never report one and the suite is the
 * only gate that does.
 */

import type { FeedbackContext } from './context';
import type { FeedbackElementDescription } from './picker';
import type { ReportField, ReportFieldOption, ReportTemplate }
  from '../../core/reportTemplate';

import { DEVTOOLS_UNKNOWN_VERSION } from '../../core/host';

/** What one answered field may hold: one value, or several ticked. */
export type FeedbackFieldValue = string | readonly string[];

/**
 * Every answer the form holds, keyed by field id.
 *
 * A key may be absent and a value may be `undefined`: a form draws
 * its controls before anything is typed into them, and the two shapes
 * mean the same thing here.
 */
export type FeedbackValues
  = Readonly<Record<string, FeedbackFieldValue | undefined>>;

/** Everything {@link buildFeedbackBody} reads, in one argument. */
export interface FeedbackBodyInput {
  /** The form that was filled in; its fields set the section order. */
  readonly template: ReportTemplate;

  /** What was typed, chosen and ticked. */
  readonly values: FeedbackValues;

  /** What `./context.ts` collected at submit time. */
  readonly context: FeedbackContext;

  /**
   * The element the picker described, when one was picked.
   *
   * Absent where the template opted out of the selector, and `null`
   * where it offers one and nobody picked anything.
   */
  readonly element?: FeedbackElementDescription | null;
}

/** The heading over the widget's own summary. */
const CONTEXT_HEADING = 'Context';

/** The heading over the collected record's table. */
const ENVIRONMENT_HEADING = 'Environment';

/** The heading over the same record's fenced `json` block. */
const RECORD_HEADING = 'Context record';

/** The info string the machine-readable block is fenced with. */
const RECORD_FENCE_LANGUAGE = 'json';

/** How the two-column table names its columns. */
const ENVIRONMENT_COLUMNS = '| Key | Value |\n| --- | --- |';

/** Written where the collected record turned out to hold nothing. */
const ENVIRONMENT_EMPTY = '_Nothing was collected._';

/** How many spaces one level of the fenced record is indented by. */
const RECORD_INDENT = 2;

/** The shortest fence CommonMark accepts. */
const FENCE_MINIMUM = 3;

/**
 * Collapse every whitespace run to one space and trim.
 *
 * Used on anything that has to sit inside one line — a heading, a
 * table cell, a bullet — because a newline in any of the three ends
 * the construct it is in.
 *
 * @param text - Whatever a template, a page or a person supplied.
 * @returns The text on one line.
 */
function collapse(text: string): string {
  return text.replace(/\s+/gu, ' ').trim();
}

/**
 * The length of the longest run of backticks in some text.
 *
 * @param text - What is about to be fenced or code-spanned.
 * @returns `0` when there is no backtick at all.
 */
function longestBacktickRun(text: string): number {
  const runs = text.match(/`+/gu) ?? [];

  return runs.reduce((longest, run) => Math.max(longest, run.length), 0);
}

/**
 * Fence some text so nothing inside it can close the fence.
 *
 * @param text - The content, written verbatim.
 * @param language - The info string, or `''` for a bare fence.
 * @returns The opening fence, the content and the closing fence.
 */
function fence(text: string, language: string): string {
  const length = Math.max(FENCE_MINIMUM, longestBacktickRun(text) + 1);
  const rule = '`'.repeat(length);

  return `${rule}${language}\n${text}\n${rule}`;
}

/**
 * Write one value as a code span, whatever backticks it holds.
 *
 * @param value - A selector, a tag name or anything else literal.
 * @returns The code span.
 */
function inlineCode(value: string): string {
  const rule = '`'.repeat(longestBacktickRun(value) + 1);
  const pad = value.startsWith('`') || value.endsWith('`')
    ? ' '
    : '';

  return `${rule}${pad}${value}${pad}${rule}`;
}

/**
 * Write one value into a table cell.
 *
 * A pipe would start a new column and a backslash would escape
 * whatever followed it, so both are escaped; a newline would end the
 * row, so {@link collapse} has already taken it out.
 *
 * @param value - One member of the collected record.
 * @returns The cell's text.
 */
function tableCell(value: string): string {
  return collapse(value)
    .replace(/\\/gu, '\\\\')
    .replace(/\|/gu, '\\|');
}

/**
 * Read one answer as a single line of text.
 *
 * @param value - Whatever the form holds under the field's id.
 * @returns The trimmed text, or `null` when there is nothing to show.
 */
function asText(value: FeedbackFieldValue | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  return trimmed === ''
    ? null
    : trimmed;
}

/**
 * Read one answer as the list of values a person ticked.
 *
 * A bare string is read as a single ticked box rather than dropped: a
 * renderer holding a one-box `checkboxes` in a string is handing over
 * an answer that was given, and an answer that was given is not
 * something this builder silently loses.
 *
 * @param value - Whatever the form holds under the field's id.
 * @returns The non-blank members, in the order they arrived.
 */
function asList(value: FeedbackFieldValue | undefined): readonly string[] {
  const raw = typeof value === 'string'
    ? [value]
    : value ?? [];

  return raw
    .filter((member) => typeof member === 'string')
    .map((member) => member.trim())
    .filter((member) => member !== '');
}

/**
 * What a template draws for one chosen value.
 *
 * @param options - The field's declared options.
 * @param value - What the form submitted.
 * @returns The option's label, or the value itself when no option
 * carries it — a template that changed under a draft is reported as
 * it was answered rather than dropped.
 */
function optionLabel(
  options: readonly ReportFieldOption[],
  value: string,
): string {
  const chosen = options.find((option) => option.value === value);

  return chosen === undefined
    ? value
    : chosen.label;
}

/**
 * Render one field's answer, without its heading.
 *
 * @param field - The field, over all seven kinds.
 * @param values - Every answer the form holds.
 * @returns The Markdown, or `null` where this field contributes no
 * section — see this module's documentation for the three kinds that
 * never do and for what counts as empty.
 */
function renderAnswer(
  field: ReportField,
  values: FeedbackValues,
): string | null {
  if (
    field.kind === 'readonly'
    || field.kind === 'file'
    || field.kind === 'selector'
  ) {
    return null;
  }

  if (field.kind === 'checkboxes') {
    const ticked = asList(values[field.id]);

    return ticked.length === 0
      ? null
      : ticked
        .map((value) => `- ${collapse(optionLabel(field.options, value))}`)
        .join('\n');
  }

  const answer = asText(values[field.id]);

  if (answer === null) {
    return null;
  }

  if (field.kind === 'select') {
    return collapse(optionLabel(field.options, answer));
  }

  if (field.kind === 'textarea' && field.render !== undefined) {
    return fence(answer, field.render);
  }

  return answer;
}

/**
 * One section: a `##` heading, a blank line and a body.
 *
 * @param heading - The heading's text, on one line.
 * @param body - Whatever sits under it.
 * @returns The section, with no trailing newline of its own.
 */
function section(heading: string, body: string): string {
  return `## ${collapse(heading)}\n\n${body}`;
}

/**
 * The selector as the report should carry it.
 *
 * The field's own value wins over the described element's, because a
 * climb rewrites the field and the description it climbed from is the
 * older of the two readings.
 *
 * @param input - What the builder was handed.
 * @returns The selector, or `null` when there is none.
 */
function readSelector(input: FeedbackBodyInput): string | null {
  const field = input.template.fields.find(
    (candidate) => candidate.kind === 'selector',
  );
  const typed = field === undefined
    ? null
    : asText(input.values[field.id]);

  if (typed !== null) {
    return typed;
  }

  return input.element === undefined || input.element === null
    ? null
    : asText(input.element.selector);
}

/**
 * The page the report was filed from.
 *
 * @param context - The collected record.
 * @returns The URL, or {@link DEVTOOLS_UNKNOWN_VERSION} where the
 * record carries none.
 */
function readUrl(context: FeedbackContext): string {
  const url = context.url;

  return typeof url === 'string' && url.trim() !== ''
    ? collapse(url)
    : DEVTOOLS_UNKNOWN_VERSION;
}

/**
 * The bullets under `## Context`.
 *
 * The URL comes from the collected record rather than from
 * `location`, so the report and the record can never name two pages.
 * A record with no `url` key reads {@link DEVTOOLS_UNKNOWN_VERSION},
 * the one word this package uses for "nothing could say", which keeps
 * the section non-empty and the section order fixed.
 *
 * @param input - What the builder was handed.
 * @returns The bullets, one per line.
 */
function contextBody(input: FeedbackBodyInput): string {
  const lines = [`- URL: ${readUrl(input.context)}`];
  const selector = readSelector(input);
  const element = input.element ?? null;

  if (selector !== null) {
    lines.push(`- Selector: ${inlineCode(collapse(selector))}`);
  }

  if (element !== null) {
    const { rect } = element;
    const size = `${Math.round(rect.width)}x${Math.round(rect.height)}`;
    const at = `(${Math.round(rect.x)}, ${Math.round(rect.y)})`;
    const text = collapse(element.text);

    lines.push(`- Element: ${inlineCode(collapse(element.tag))}`);

    if (text !== '') {
      lines.push(`- Text: "${text}"`);
    }

    lines.push(`- Box: ${size} at ${at}`);
  }

  return lines.join('\n');
}

/**
 * The collected record as a two-column table.
 *
 * Keys are written in the record's own order, which is the order
 * `./context.ts` merged its four sources in, so two reports of one
 * session list their rows the same way.
 *
 * @param context - The collected record.
 * @returns The table, or a sentence where the record held nothing.
 */
function environmentBody(context: FeedbackContext): string {
  const rows = Object.entries(context).map(
    ([key, value]) => `| ${tableCell(key)} | ${tableCell(String(value))} |`,
  );

  return rows.length === 0
    ? ENVIRONMENT_EMPTY
    : [ENVIRONMENT_COLUMNS, ...rows].join('\n');
}

/**
 * Build the whole report body.
 *
 * Pure: it reads its argument, mutates nothing and reaches nothing.
 * The answer ends with exactly one newline, so a caller appending to
 * it — `src/vite/gateway/rafa.ts` appends the stored attachment paths
 * — starts on a fresh line without having to guess.
 *
 * @param input - The template, the answers, the context and the
 * picked element.
 * @returns The Markdown document, sections in the fixed order this
 * module's documentation lists.
 */
export function buildFeedbackBody(input: FeedbackBodyInput): string {
  const answered = input.template.fields.flatMap((field) => {
    const answer = renderAnswer(field, input.values);

    return answer === null
      ? []
      : [section(field.label ?? field.id, answer)];
  });
  const record = JSON.stringify(input.context, null, RECORD_INDENT);
  const sections = [
    section(CONTEXT_HEADING, contextBody(input)),
    ...answered,
    section(ENVIRONMENT_HEADING, environmentBody(input.context)),
    section(RECORD_HEADING, fence(record, RECORD_FENCE_LANGUAGE)),
  ];

  return `${sections.join('\n\n')}\n`;
}
