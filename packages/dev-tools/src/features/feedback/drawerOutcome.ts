/**
 * @packageDocumentation
 * What the drawer's `role="status"` line says about each
 * {@link SubmitResult}, and the escape hatch a report that never
 * reached GitHub is offered instead.
 *
 * Pure, like `./drawerModel.ts` and for the same reason: the sentence
 * a person is shown is a decision, decisions live in a `.ts` the jsdom
 * vitest project collects, and `./FeedbackDrawer.tsx` stays a
 * component that draws what it is handed.
 *
 * ## One line, four shapes, no fifth
 *
 * `./submit.ts` closes {@link SubmitResult} at four because this line
 * has four things to say, and {@link describeFeedbackOutcome} is the
 * other half of that: every shape answers a sentence, the function is
 * total over the union, and the drawer never has to decide what to do
 * with an outcome it was not expecting.
 *
 * ## A tracker's own words are reduced before they are spoken
 *
 * Three of the four sentences interpolate something the dev server or
 * the tracker supplied — an issue id, a matched title, a path on
 * disk. `./submit.ts` trims those members and refuses the unusable
 * ones, but it does not flatten them: a tracker title carrying a
 * newline would break the line in two, and a path from a machine
 * nobody controls could be arbitrarily long.
 *
 * So {@link oneLine} collapses whitespace and caps, and it is a
 * respelling of `./submit.ts`'s private helper rather than an import:
 * that one is not exported, and exporting it would be an edit to a
 * module this file has no business changing. The two agree on the
 * behaviour that matters — one line, capped — and the cap here is the
 * DISPLAY cap, which is a different number with a different job.
 *
 * `./submitRules.ts`'s rule that a reason carries nothing a person
 * typed is not broken here: these sentences are shown, never sent,
 * and the whole point of the duplicate line is to show the operator
 * the title the tracker matched so they can judge it.
 *
 * ## Spec item 7's local-tracker path, read against the type
 *
 * The spec says: "On `stored` with tracker `local` the drawer shows a
 * prefilled GitHub new-issue link ... and a copy block of the same
 * body". `SubmitStored` carries a `path` and NO tracker — a `stored`
 * answer is precisely the one where no gateway filed anything — while
 * rafa's chain falling back to its local tracker answers `filed
 * {tracker: 'local'}`. The two shapes are one situation to the person
 * in front of the drawer: GitHub does not have this report.
 *
 * {@link feedbackNeedsIssueLink} is therefore true for `stored` and
 * for a `filed` whose tracker is not GitHub, and false for the other
 * two. Written as "not github" rather than "is local" so a chain that
 * lands on some third tracker still offers the way out rather than
 * silently offering nothing.
 *
 * ## The link is built, and may still be refused
 *
 * {@link feedbackIssueUrl} answers `null` for a slug that is not
 * `owner/name` — `unknown`, which is what `src/vite/git.ts` answers
 * outside a repository or without an `origin`, has no slash and is
 * refused by the same test. A `null` link is not a failure: the copy
 * block beside it carries the same body, which is why spec item 7
 * pairs them.
 *
 * The length of the result is deliberately NOT capped. A body at
 * `./submitRules.ts`'s 5,000-character limit percent-encodes to
 * something in the tens of kilobytes, and whether a given GitHub
 * deployment accepts a URL that long is not something this package can
 * measure from here. The copy block is the answer to that unknown:
 * truncating the link would make it quietly file a partial report,
 * which is worse than a link that does not open.
 *
 * ## Mutation note — what the colocated cases actually catch
 *
 * A green suite is no evidence a case can fail. Each leg below was
 * measured by breaking this file, running `bun x vitest run
 * src/features/feedback/drawerOutcome.test.ts` from
 * `packages/dev-tools`, and restoring this file byte-identical
 * (SHA-256 compared before and after, every leg). The baseline is
 * `Tests 23 passed (23)`.
 *
 * - Speaking a duplicate's title raw, without {@link oneLine},
 *   answers `2 failed | 21 passed`: the newline case and the cap.
 * - Speaking a stored report's path raw answers `1 failed | 22
 *   passed`: `caps a path longer than the value limit`. The two
 *   reductions red separately, so neither is covered only by the
 *   other.
 * - Answering `false` from {@link feedbackNeedsIssueLink} for every
 *   `filed`, so only `stored` offers the way out, answers `1 failed |
 *   22 passed`: `is true for a report filed on the local tracker` —
 *   the whole of this module's reading of spec item 7 rests on it.
 * - Comparing the tracker name without lower-casing or trimming
 *   answers `1 failed | 22 passed`: `is false however the tracker
 *   spelled github`.
 * - Dropping the {@link DOTS_ONLY} guard answers `1 failed | 22
 *   passed`: `answers null for a slug whose owner is dots alone`.
 * - Writing the template id into the query without
 *   {@link TEMPLATE_EXTENSION} answers `1 failed | 22 passed`: `names
 *   the template file, the title and the body`.
 * - Dropping the `Object.freeze` from {@link feedbackRefusal} answers
 *   `1 failed | 22 passed`.
 *
 * `bun x tsc --noEmit` exits `0` under ALL SEVEN, measured one by one:
 * every leg is a behaviour change over types that still line up, so
 * `check-types` would never report one and the suite is the only gate
 * that does.
 */

import type { SubmitRefused, SubmitResult } from './submit';

import { FEEDBACK_TITLE_LIMIT } from './submitRules';

/** GitHub's origin, where a prefilled new-issue form is opened. */
const GITHUB_ORIGIN = 'https://github.com';

/** The tracker name that means the report is already where it belongs. */
const GITHUB_TRACKER = 'github';

/**
 * What a slug segment may be spelled with.
 *
 * `src/vite/git.ts`'s `REPO_SEGMENT`, respelt: the feature layer may
 * not import the node layer, `eslint.config.mjs` refuses it, and this
 * is the browser-side reading of a value that module produced. A
 * drift makes a link that should have been offered read as `null`,
 * which the copy block covers.
 */
const REPO_SEGMENT = '[A-Za-z0-9._-]{1,100}';

/** The whole `owner/name` slug, anchored. */
const REPO_SLUG = new RegExp(`^(${REPO_SEGMENT})/(${REPO_SEGMENT})$`);

/** A segment of dots alone, which names no owner and no repository. */
const DOTS_ONLY = /^\.+$/;

/** The path a prefilled issue form is opened at. */
const NEW_ISSUE_PATH = 'issues/new';

/**
 * The extension a template file is assumed to carry.
 *
 * `src/vite/templates.ts` derives a template id from the FILENAME and
 * drops the extension, and it reads both `.yml` and `.yaml`. So the
 * file name cannot be recovered exactly, and this is the spelling both
 * forms in `.github/ISSUE_TEMPLATE/` actually use. A `.yaml` template
 * therefore opens GitHub's blank new-issue form with the title and
 * body still prefilled, rather than its own form — a degradation, and
 * a visible one.
 */
const TEMPLATE_EXTENSION = '.yml';

/** Every control character, C0 and C1 alike, as a property escape. */
const CONTROL_CHARACTERS = /\p{Cc}/gu;

/** Any run of whitespace, collapsed to one space for display. */
const WHITESPACE_RUN = /\s+/gu;

/** What a shortened value ends with. Plain ASCII, deliberately. */
const ELLIPSIS = '...';

/**
 * The longest issue id, tracker name or path this line will speak.
 *
 * Shorter than a title's cap because none of the three is prose: an
 * issue number, a tracker's name and a path under `.rafa/feedback/`
 * are all well under it, and a value that is not is something the
 * drawer should not be reading out in full.
 */
export const FEEDBACK_OUTCOME_VALUE_LIMIT = 120;

/** What is said when the report reached the tracker. */
const FILED_PREFIX = 'Filed as ';

/** What is said when the tracker already had it. */
const DUPLICATE_PREFIX = 'Already on the tracker as ';

/** What is said when the report has gone no further than this machine. */
const STORED_PREFIX = 'Saved on this machine at ';

/** ...and the rest of that sentence. */
const STORED_SUFFIX = '. It did not reach the tracker.';

/**
 * Reduce a supplied value to one line a status region can speak.
 *
 * @param text - Whatever the dev server or the tracker answered.
 * @param limit - How much of it survives.
 * @returns The text with control characters replaced by spaces,
 * whitespace runs collapsed, trimmed, and capped at `limit` with an
 * ellipsis; `''` when there was nothing to say.
 */
function oneLine(text: string, limit: number): string {
  const line = text
    .replace(CONTROL_CHARACTERS, ' ')
    .replace(WHITESPACE_RUN, ' ')
    .trim();

  return line.length > limit
    ? `${line.slice(0, limit)}${ELLIPSIS}`
    : line;
}

/**
 * Build a refusal the drawer raised itself.
 *
 * `./submit.ts` builds the ones that come off an answer; this is the
 * same shape for the ones that never leave the browser — a rule from
 * `./submitRules.ts`, a file `./DropZone.tsx` would not take, an
 * encoding that threw — so the `role="status"` line reads one type
 * whatever refused.
 *
 * @param reason - The sentence to show, already fixed text.
 * @returns The frozen result.
 */
export function feedbackRefusal(reason: string): SubmitRefused {
  return Object.freeze({ status: 'refused' as const, reason });
}

/**
 * What the outcome line says.
 *
 * @param result - What `./submit.ts` mapped the answer onto.
 * @returns One sentence, on one line. Total over the four shapes:
 * there is no default branch and no empty answer.
 */
export function describeFeedbackOutcome(result: SubmitResult): string {
  if (result.status === 'refused') {
    return result.reason;
  }

  if (result.status === 'stored') {
    const path = oneLine(result.path, FEEDBACK_OUTCOME_VALUE_LIMIT);

    return `${STORED_PREFIX}${path}${STORED_SUFFIX}`;
  }

  const id = oneLine(result.id, FEEDBACK_OUTCOME_VALUE_LIMIT);

  if (result.status === 'duplicate') {
    const title = oneLine(result.title, FEEDBACK_TITLE_LIMIT);

    return `${DUPLICATE_PREFIX}${id}: ${title}`;
  }

  const tracker = oneLine(result.tracker, FEEDBACK_OUTCOME_VALUE_LIMIT);

  return `${FILED_PREFIX}${id} on ${tracker}.`;
}

/**
 * Whether GitHub is missing this report and should be offered it.
 *
 * @param result - What `./submit.ts` mapped the answer onto.
 * @returns `true` for a report that only reached the disk, and for one
 * filed on a tracker other than GitHub; `false` for a GitHub filing
 * and for the two answers that describe no filed report at all.
 */
export function feedbackNeedsIssueLink(result: SubmitResult): boolean {
  if (result.status === 'stored') {
    return true;
  }

  if (result.status !== 'filed') {
    return false;
  }

  return result.tracker.trim().toLowerCase() !== GITHUB_TRACKER;
}

/** Everything {@link feedbackIssueUrl} reads, in one argument. */
export interface FeedbackIssueLinkInput {
  /** The `owner/name` slug the status endpoint answered. */
  readonly repo: string | null;

  /** The chosen template's id, for GitHub's own form chooser. */
  readonly templateId: string;

  /** The title as it was sent. */
  readonly title: string;

  /** The Markdown body as it was sent. */
  readonly body: string;
}

/**
 * Build the prefilled GitHub new-issue link.
 *
 * @param input - {@link FeedbackIssueLinkInput}.
 * @returns The absolute URL, or `null` when the slug is absent or is
 * not an `owner/name` pair — outside a repository, without an
 * `origin`, or where `src/vite/git.ts` refused the remote and answered
 * `unknown`.
 */
export function feedbackIssueUrl(
  input: FeedbackIssueLinkInput,
): string | null {
  const match = input.repo === null
    ? null
    : REPO_SLUG.exec(input.repo.trim());

  if (match === null) {
    return null;
  }

  const [, owner, name] = match;

  if (
    owner === undefined
    || name === undefined
    || DOTS_ONLY.test(owner)
    || DOTS_ONLY.test(name)
  ) {
    return null;
  }

  const query = new URLSearchParams();

  if (input.templateId !== '') {
    query.set('template', `${input.templateId}${TEMPLATE_EXTENSION}`);
  }

  query.set('title', input.title);
  query.set('body', input.body);

  return `${GITHUB_ORIGIN}/${owner}/${name}/${NEW_ISSUE_PATH}?${query}`;
}
