/**
 * @packageDocumentation
 * What the drawer refuses to submit, and why — as pure functions, one
 * per refusal, each answering the sentence shown to the person.
 *
 * Spec item 3 lists them: "Refusals first: empty title, over length,
 * unknown template, selector matching nothing", and spec item 4 adds
 * the attachment's two — "PNG/JPEG only, ≤ 5 MB". Every one of them
 * lives here rather than in the drawer, because a refusal is a
 * decision and this package's two-runner rule puts a decision in a
 * `.ts` the vitest jsdom project collects, leaving the `.tsx` thin.
 *
 * ## A refusal is a value, and the value is the sentence
 *
 * Each function answers `string | null`: the reason when it refuses,
 * `null` when it has nothing to say. `null` is the ACCEPTING answer
 * here, which reads backwards next to a predicate and is the right
 * way round for these — a caller shows what it is handed and shows
 * nothing when it is handed nothing, so the drawer never has to map a
 * boolean onto a sentence and a second copy of the wording never
 * exists. {@link refuseSubmit} composes them in a fixed order and
 * answers the FIRST reason, because a form that lists six complaints
 * at once is a form nobody reads to the end of.
 *
 * ## No reason carries anything a person typed
 *
 * Every string below is fixed text, or fixed text around a constant
 * declared in this file. None of them interpolates a title, a
 * selector, an attachment name or a template id — the same discipline
 * `src/vite/gateway/call.ts` holds a gateway reason to, for the same
 * reason: a reason travels. It reaches `./submit.ts`'s `refused
 * {reason}`, and from there the drawer's `role="status"` line. Fixed
 * text cannot reflect a page's input back at it whatever a later
 * renderer does with it, and it lets the colocated cases pin the
 * sentence rather than a shape.
 *
 * ## The two limits that are spelled twice
 *
 * {@link FEEDBACK_TITLE_LIMIT} and {@link FEEDBACK_BODY_LIMIT} are
 * the endpoint's own `title` ≤ 120 and `body` ≤ 5,000, which live in
 * `src/vite/report.ts` and are RESPELT here rather than imported. The
 * layering is what forces it: `src/vite/` is the node layer,
 * `eslint.config.mjs` refuses an import of it from a feature, and it
 * refuses it from this file's cases too — so neither the module nor
 * its tests can read the numbers at their source, and a filesystem
 * read of that file would need a node builtin the same config bans.
 *
 * So this is a real duplication with a real drift risk, and it is
 * asymmetric rather than dangerous: these are the EARLIER guard. A
 * number too small here refuses a report the endpoint would have
 * taken, visibly, in the drawer. A number too large lets one through
 * to be refused by zod with a field path, which `./submit.ts` maps to
 * `refused {reason}` — still a refusal, one round trip later.
 * `src/core/reportTemplate.ts`'s header already names this file as
 * the one place the PNG/JPEG list and the 5 MB cap live, so a reader
 * looking for either is sent here; the two length limits are
 * documented at both ends for the same reason.
 *
 * ## "Characters" means CODE POINTS, and that is not decoration
 *
 * `src/vite/report.ts` measured zod 4's counting: `z.string().max(120)`
 * accepts 61 astral characters (122 UTF-16 units) and refuses 121.
 * Measured again here against zod 4.6.5 before these limits were
 * written, with the same answer. So the endpoint counts what a reader
 * counts, and `String.length` — which counts UTF-16 units — would
 * refuse a title of 61 emoji that the endpoint accepts. {@link
 * lengthInCodePoints} is the spread-and-count that agrees with it.
 *
 * ## What this module deliberately does NOT refuse
 *
 * - **A body that is empty.** The endpoint's `body` is `.min(1)`, but
 *   the body is BUILT by `./body.ts` out of the template's fields and
 *   the context block, so it can only be empty if that builder is
 *   broken — a bug to red a case in that file, not a sentence to show
 *   a person who cannot act on it.
 * - **A required field left blank.** `required` is a GitHub
 *   issue-form property carried through
 *   `src/core/reportTemplate.ts`, and it is the renderer's to
 *   enforce at the control that holds it, where the message can sit
 *   under the field rather than under the submit button.
 * - **A fourth attachment.** The endpoint caps `attachments` at three.
 *   Nothing in this plan's drawer can produce more than one, so the
 *   cap would be a rule with no reachable input; spec item 4 names the
 *   type and the size and nothing else.
 *
 * ## Nothing here reads the document
 *
 * {@link refuseSelector} is handed what `./picker.ts`'s `matchesOf`
 * already answered rather than running the selector itself. That
 * keeps every function in this file a pure reading of its arguments —
 * no `document`, no clock, no module state — and it means the drawer
 * counts matches once for the field's live match count and reuses
 * that count at submit, instead of asking the page a second question
 * whose answer may have changed in between.
 *
 * ## Mutation note — what the colocated cases actually catch
 *
 * A green suite is not evidence a case can fail. Each leg below was
 * measured by breaking this file, running `bun x vitest run
 * src/features/feedback/submitRules.test.ts` from
 * `packages/dev-tools` against the 31 cases that file holds, and
 * restoring this file byte-identical — a SHA-256 of the restored text
 * compared to the original's, every leg, all eighteen restored clean.
 * The baseline is `Tests 31 passed (31)`.
 *
 * - Reading {@link FEEDBACK_TITLE_LIMIT} as 121 answers `Tests 2
 *   failed | 29 passed (31)`, and loosening the comparison in {@link
 *   refuseTitle} by one instead answers the same two: `refuses a title
 *   of 121 characters and accepts one of 120` and `counts a title in
 *   code points, not in UTF-16 units`. The second falls with the first
 *   because its over-limit half is 121 code points, which is the point
 *   — that case reads the same boundary in the other unit rather than
 *   a boundary of its own.
 * - Counting with `title.length` instead of {@link
 *   lengthInCodePoints} answers `1 failed | 30 passed`: the code-point
 *   case alone, whose accepted half is 120 astral characters.
 * - Reading {@link FEEDBACK_BODY_LIMIT} as 5,001 answers `2 failed |
 *   29 passed`, and so does loosening the comparison in {@link
 *   refuseBody}: the body boundary and `answers the over-long body`,
 *   which is the composed reading of it.
 * - Dropping the trim from {@link refuseTitle} answers `2 failed | 29
 *   passed`: `refuses a title of spaces as an empty one` and its
 *   composed twin.
 * - Reading {@link FEEDBACK_ATTACHMENT_BYTES_LIMIT} as `5_000_000`
 *   answers `1 failed | 30 passed`, and reading {@link
 *   FEEDBACK_ATTACHMENT_MEGABYTES} as 6 answers `1 failed | 30
 *   passed` too — both the size boundary. That leg is the reason the
 *   boundary case carries LITERAL byte counts: written as
 *   `FEEDBACK_ATTACHMENT_BYTES_LIMIT + 1`, it moved with the constant
 *   and the `5_000_000` leg left all 31 cases GREEN (measured, before
 *   the case was rewritten). A silent pass, and the only hole either
 *   the suite or this note ever had.
 * - Adding `image/gif` to {@link FEEDBACK_ATTACHMENT_MIMES} answers `1
 *   failed | 30 passed` (`refuses a type outside PNG and JPEG`), and
 *   dropping `image/jpeg` from it answers `1 failed | 30 passed`
 *   (`accepts the captured PNG and a dropped JPEG`). The two
 *   directions red different cases, so neither is covered only by the
 *   other.
 * - Comparing the mime without lower-casing it answers `1 failed | 30
 *   passed`: `accepts a mime a browser reported in upper case`.
 * - Ignoring `{valid: false}` in {@link refuseSelector} answers `1
 *   failed | 30 passed`, and ignoring an empty match list answers `2
 *   failed | 29 passed`: the unreadable selector and the one that
 *   matches nothing red separately, the second taking its composed
 *   twin with it.
 * - Dropping the blank-value half of {@link refuseSelector}'s guard,
 *   so an empty field is refused as matching nothing, answers `1
 *   failed | 30 passed`: `accepts a blank field and a field of
 *   spaces`.
 * - Widening {@link refuseTemplate} to accept any non-empty id answers
 *   `3 failed | 28 passed`: the unknown id, the served-nothing list,
 *   and the composed reading.
 * - Reading the title before the template in {@link refuseSubmit}
 *   answers `1 failed | 30 passed`: `answers the template reason first
 *   when the template and the title are both wrong`, which is the only
 *   case that pins the ORDER rather than the set.
 * - Reading only the first attachment in {@link refuseSubmit} answers
 *   `1 failed | 30 passed`: `refuses the second attachment when the
 *   first is acceptable`.
 *
 * `bun x tsc --noEmit` exits `0` under ALL EIGHTEEN, measured one by
 * one: every leg is a behaviour change over types that still line up,
 * so `check-types` would never report one and the suite is the only
 * gate that does.
 */

import type { FeedbackSelectorMatches } from './picker';

import { FEEDBACK_CAPTURE_MIME } from './capture';

/**
 * The endpoint's `title` ≤ 120, in code points.
 *
 * See this module's documentation for why the number is spelled here
 * as well as in `src/vite/report.ts`.
 */
export const FEEDBACK_TITLE_LIMIT = 120;

/** The endpoint's `body` ≤ 5,000, in code points. */
export const FEEDBACK_BODY_LIMIT = 5_000;

/**
 * Spec item 4's "≤ 5 MB", as the number a person reads.
 *
 * Kept beside {@link FEEDBACK_ATTACHMENT_BYTES_LIMIT} so the sentence
 * and the comparison can never name different sizes.
 */
const FEEDBACK_ATTACHMENT_MEGABYTES = 5;

/** One mebibyte, which is what "MB" means at both ends of this. */
const BYTES_PER_MEGABYTE = 1024 * 1024;

/**
 * Spec item 4's cap, read as mebibytes.
 *
 * `5 * 1024 * 1024`, which is the reading `src/vite/report.ts` takes
 * of the same limit — deliberately the same, so a screenshot that
 * passes here is not refused by the endpoint 5% later. The two
 * readings differ only at the boundary, and the colocated cases sit
 * on THIS one.
 */
export const FEEDBACK_ATTACHMENT_BYTES_LIMIT
  = FEEDBACK_ATTACHMENT_MEGABYTES * BYTES_PER_MEGABYTE;

/**
 * The two types an attachment may be.
 *
 * `image/png` is imported from `./capture` rather than respelt: it is
 * the type `captureScreen()` answers, and a report whose capture and
 * whose rules disagreed about the spelling would refuse the widget's
 * own screenshot. `image/jpeg` is the drop zone's other accepted
 * type, and the only spelling of it — `image/jpg` is not a registered
 * type and no browser reports it, so a file carrying it is refused
 * rather than guessed at.
 */
export const FEEDBACK_ATTACHMENT_MIMES: readonly string[] = Object.freeze([
  FEEDBACK_CAPTURE_MIME,
  'image/jpeg',
]);

/** Shown when the title field holds nothing but space. */
const TITLE_EMPTY = 'A report needs a title.';

/** Shown when the title is longer than the endpoint accepts. */
const TITLE_TOO_LONG
  = `A title is at most ${FEEDBACK_TITLE_LIMIT} characters.`;

/** Shown when the built body is longer than the endpoint accepts. */
const BODY_TOO_LONG
  = `A report is at most ${FEEDBACK_BODY_LIMIT} characters; shorten an `
  + 'answer and try again.';

/**
 * Shown when the chosen report type is not one the dev server serves.
 *
 * One sentence for both shapes — nothing chosen, and an id no served
 * template carries — because the person can only do one thing about
 * either, and naming the id back at them would put input in a reason.
 */
const TEMPLATE_UNKNOWN
  = 'Choose one of the report types this dev server serves.';

/** Shown when the browser cannot parse the selector at all. */
const SELECTOR_UNREADABLE
  = 'That selector is not one the browser can read.';

/** Shown when the selector parses and points at nothing. */
const SELECTOR_MATCHES_NOTHING
  = 'That selector matches nothing on this page.';

/** Shown when an attachment is neither a PNG nor a JPEG. */
const ATTACHMENT_WRONG_TYPE = 'An attachment is a PNG or a JPEG.';

/** Shown when an attachment is over the size cap. */
const ATTACHMENT_TOO_LARGE
  = `An attachment is at most ${FEEDBACK_ATTACHMENT_MEGABYTES} MB.`;

/**
 * The little a rule needs to know about a served template.
 *
 * A `ReportTemplate` from `src/core/reportTemplate.ts` satisfies it
 * structurally, and so does the identity list a drawer keeps beside
 * its select. Taken this narrow on purpose: an id is the only thing a
 * refusal reads, so demanding a whole template would make a caller —
 * and a case — build six fields to ask one question.
 */
export interface FeedbackTemplateChoice {
  /** The template's stable id, as the select's value carries it. */
  readonly id: string;
}

/**
 * The selector field as the drawer holds it: the text, and what it
 * matched when the drawer last asked.
 *
 * The matches come from `./picker.ts`'s `matchesOf`, which is also
 * what draws the field's live match count, so the rule and the count
 * can never disagree.
 */
export interface FeedbackSelectorDraft {
  /** Whatever was typed, picked or climbed to. */
  readonly value: string;

  /** What `matchesOf` answered for it. */
  readonly matches: FeedbackSelectorMatches;
}

/**
 * One file travelling with a report, as far as a rule cares.
 *
 * A browser `File` and a `Blob` both satisfy it, so the drop zone
 * hands its `File` straight in and `captureScreen()`'s `Blob` needs
 * no wrapper.
 */
export interface FeedbackAttachment {
  /** The mime the browser reported. */
  readonly type: string;

  /** The size in bytes, decoded — what `File.size` answers. */
  readonly size: number;
}

/**
 * Everything {@link refuseSubmit} reads, in one argument.
 *
 * Built fresh by the drawer at the moment submit is pressed. Nothing
 * here is optional except the selector, which a template may have
 * opted out of entirely.
 */
export interface FeedbackSubmitDraft {
  /** The id the report-type select carries. */
  readonly templateId: string;

  /** The templates the dev server served. */
  readonly templates: readonly FeedbackTemplateChoice[];

  /** The title as typed. */
  readonly title: string;

  /** The body `./body.ts` built. */
  readonly body: string;

  /** The selector field, or `null` where the template has none. */
  readonly selector: FeedbackSelectorDraft | null;

  /** The files captured, dropped or chosen. */
  readonly attachments: readonly FeedbackAttachment[];
}

/**
 * Count a string the way the endpoint's zod counts it.
 *
 * @param value - Any text.
 * @returns Its length in code points, not in UTF-16 units.
 */
function lengthInCodePoints(value: string): number {
  return [...value].length;
}

/**
 * Refuse a title that is empty or longer than the endpoint accepts.
 *
 * Emptiness is read off the TRIMMED text — a title of spaces is an
 * empty title to everyone but `String.length` — while the length is
 * read off the text as given, because that is what will be sent.
 *
 * @param title - The title field's value.
 * @returns The reason, or `null` when the title may be sent.
 */
export function refuseTitle(title: string): string | null {
  if (title.trim() === '') {
    return TITLE_EMPTY;
  }

  if (lengthInCodePoints(title) > FEEDBACK_TITLE_LIMIT) {
    return TITLE_TOO_LONG;
  }

  return null;
}

/**
 * Refuse a body longer than the endpoint accepts.
 *
 * An empty body is not refused; see this module's documentation for
 * why that is the body builder's to red rather than this file's.
 *
 * @param body - The built report body.
 * @returns The reason, or `null` when the body may be sent.
 */
export function refuseBody(body: string): string | null {
  if (lengthInCodePoints(body) > FEEDBACK_BODY_LIMIT) {
    return BODY_TOO_LONG;
  }

  return null;
}

/**
 * Refuse a report type the dev server did not serve.
 *
 * @param templateId - The id the select carries; `''` when the person
 * has chosen nothing yet.
 * @param templates - The served templates.
 * @returns The reason, or `null` when the id names one of them.
 */
export function refuseTemplate(
  templateId: string,
  templates: readonly FeedbackTemplateChoice[],
): string | null {
  const known = templates.some((template) => template.id === templateId);

  if (!known) {
    return TEMPLATE_UNKNOWN;
  }

  return null;
}

/**
 * Refuse a selector the browser cannot read or that points at nothing.
 *
 * A blank field is not a refusal: the selector is optional, and a
 * template may not offer it at all. Spec item 5 is the authority for
 * the other two — "a selector that throws or matches nothing is a
 * visible refusal".
 *
 * @param selector - The field and its matches, or `null` where the
 * template has no selector field.
 * @returns The reason, or `null` when the selector may be sent.
 */
export function refuseSelector(
  selector: FeedbackSelectorDraft | null,
): string | null {
  if (selector === null || selector.value.trim() === '') {
    return null;
  }

  if (!selector.matches.valid) {
    return SELECTOR_UNREADABLE;
  }

  if (selector.matches.elements.length === 0) {
    return SELECTOR_MATCHES_NOTHING;
  }

  return null;
}

/**
 * Refuse an attachment of the wrong type or over the size cap.
 *
 * The type is read first, so a 9 MB PDF is called a PDF rather than
 * called large: the type is the thing a person can do something about
 * without re-taking the screenshot. The comparison is case-insensitive
 * because a mime is case-insensitive by RFC 2045, while everything
 * that produces one here reports lower case.
 *
 * @param attachment - The file, or anything carrying its type and size.
 * @returns The reason, or `null` when the file may be sent.
 */
export function refuseAttachment(
  attachment: FeedbackAttachment,
): string | null {
  const mime = attachment.type.trim().toLowerCase();

  if (!FEEDBACK_ATTACHMENT_MIMES.includes(mime)) {
    return ATTACHMENT_WRONG_TYPE;
  }

  if (attachment.size > FEEDBACK_ATTACHMENT_BYTES_LIMIT) {
    return ATTACHMENT_TOO_LARGE;
  }

  return null;
}

/**
 * Every rule above, in the order the drawer reads them.
 *
 * Template first, because a report type that is not served makes the
 * fields under it meaningless; then the title, then the built body,
 * then the selector, then each attachment in the order it was added.
 * The FIRST reason is the answer — see this module's documentation
 * for why a list of six is not.
 *
 * @param draft - What the drawer holds at the moment submit is pressed.
 * @returns The first reason, or `null` when the report may be sent.
 */
export function refuseSubmit(draft: FeedbackSubmitDraft): string | null {
  const refusals: readonly (string | null)[] = [
    refuseTemplate(draft.templateId, draft.templates),
    refuseTitle(draft.title),
    refuseBody(draft.body),
    refuseSelector(draft.selector),
    ...draft.attachments.map(refuseAttachment),
  ];

  return refusals.find((reason) => reason !== null) ?? null;
}
