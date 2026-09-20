/**
 * @packageDocumentation
 * The drawer's outcome region: the one `role="status"` line that
 * speaks every {@link SubmitResult}, and the controls each outcome
 * brings with it.
 *
 * Split out of `./FeedbackDrawer.tsx` when that file reached this
 * package's 800-line cap — the same move `src/vite/http.ts` is out of
 * `src/vite/endpoint.ts` and `src/vite/gateway/call.ts` is out of
 * `rafa.ts`. What it takes with it is a whole surface rather than a
 * handful of elements: everything drawn here is a function of the last
 * answer, and the drawer keeps the form.
 *
 * Every judgement is `./drawerOutcome.ts`'s. This file decides
 * nothing: it asks what the line says, whether GitHub is missing this
 * report and what the prefilled link is, and draws the answers.
 *
 * ## The line is a line, and the controls sit beside it
 *
 * `role="status"` sits on a `<p>` carrying one sentence. The
 * duplicate's two buttons, the prefilled link and the copy block are
 * SIBLINGS of it, never children: a live region announces its whole
 * text content when it changes, and a copy block holding 5,000
 * characters of report body inside one would be read out in full.
 * They follow it in DOM order, so a reader taken to the announcement
 * meets them next.
 *
 * The region is drawn from mount and is empty until something speaks,
 * for `src/core/Shell.tsx`'s reason: a live region added to the
 * document at the same moment as its text is one assistive technology
 * may never announce.
 *
 * ## Spec item 7, in two blocks
 *
 * A duplicate offers the matched issue, a **drop** and an **also
 * affected** — the spec's own name for that action, and the only name
 * this package uses for it anywhere.
 *
 * A report GitHub does not have offers the prefilled new-issue link
 * and a copy block of the same body. Both exist because either can
 * fail on its own: a dev server that could not name its repository
 * leaves no link, a body long enough to make an unusable URL still
 * copies, and a browser that refuses the clipboard leaves the block
 * itself to select from. `./drawerOutcome.ts` says why the link is
 * never truncated to fit.
 *
 * ## What proves what
 *
 * `./drawerOutcome.test.ts` drives every sentence, the local-tracker
 * reading and the link. The markup below is read by the
 * `react-dom/server` readings this stage lands, and the two buttons
 * are pressed by the forced Playwright spec — never by a DOM-testing
 * library, which is this package's two-runner discipline.
 */

import type { FeedbackSentReport } from './drawerDraft';
import type { SubmitResult } from './submit';
import type { ReactElement, ReactNode } from 'react';

import { useState } from 'react';

import {
  describeFeedbackOutcome,
  feedbackIssueUrl,
  feedbackNeedsIssueLink,
} from './drawerOutcome';

/** What the control that abandons a report the tracker has reads. */
const DROP_LABEL = 'Drop this report';

/** Spec item 7's name for the duplicate confirmation. The only one. */
const ALSO_AFFECTED_LABEL = 'Also affected';

/** What the link to an issue the tracker answered reads. */
const OPEN_ISSUE_LABEL = 'Open the issue';

/** The heading over the local-tracker escape hatch. */
const LOCAL_HEADING = 'File it on GitHub yourself';

/** ...and the line under it. */
const LOCAL_HINT
  = 'This report did not reach GitHub. The link opens a new issue with '
  + 'the same title and body already filled in; the copy block below '
  + 'holds the same text.';

/** What the prefilled link reads. */
const NEW_ISSUE_LABEL = 'Open a prefilled new issue';

/** What the copy control reads, and what names the block it fills. */
const COPY_LABEL = 'Copy the report body';

/** ...and what is said once the clipboard took it. */
const COPIED_NOTE = 'Copied.';

/** ...or when it would not, and the text below is the way out. */
const COPY_REFUSED_NOTE
  = 'This browser would not take it. Select the text below and copy it.';

/** How tall the copy block is drawn, in rows. */
const COPY_ROWS = 8;

/** What {@link IssueLink} takes. */
interface IssueLinkProps {
  /** Where the issue lives; `./submit.ts` admits only http and https. */
  readonly href: string;

  /** What the link reads. */
  readonly children: ReactNode;
}

/**
 * A link out of the widget, to the tracker or to GitHub.
 *
 * @param props - {@link IssueLinkProps}.
 * @returns The anchor. `rel="noreferrer"` goes with `target="_blank"`
 * always: the new tab gets no `window.opener` and no referrer, and a
 * dev widget has no reason to hand either to a tracker.
 */
function IssueLink({ href, children }: IssueLinkProps): ReactElement {
  return (
    <a
      className="devtools-feedback-link"
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  );
}

/** What {@link DuplicateActions} takes. */
interface DuplicateActionsProps {
  /** The issue the tracker matched. */
  readonly id: string;

  /** Its url, when the tracker answered a usable one. */
  readonly url?: string;

  /** Whether a request is already in flight. */
  readonly busy: boolean;

  /** Say "also affected" on the matched issue. */
  readonly onAlsoAffected: () => void;

  /** Abandon this report, because the tracker already has it. */
  readonly onDrop: () => void;
}

/**
 * The two choices spec item 7 gives a person whose report exists.
 *
 * @param props - {@link DuplicateActionsProps}.
 * @returns The link to the match where the tracker gave one, and the
 * two buttons.
 */
function DuplicateActions({
  id,
  url,
  busy,
  onAlsoAffected,
  onDrop,
}: DuplicateActionsProps): ReactElement {
  return (
    <div className="devtools-feedback-duplicate">
      {url !== undefined && (
        <IssueLink href={url}>{`${OPEN_ISSUE_LABEL} ${id}`}</IssueLink>
      )}

      <button
        type="button"
        className="devtools-feedback-drop"
        onClick={onDrop}
      >
        {DROP_LABEL}
      </button>

      <button
        type="button"
        className="devtools-feedback-also-affected"
        disabled={busy}
        onClick={onAlsoAffected}
      >
        {ALSO_AFFECTED_LABEL}
      </button>
    </div>
  );
}

/** What {@link LocalTrackerBlock} takes. */
interface LocalTrackerBlockProps {
  /** The `owner/name` slug, or `null` when the server named none. */
  readonly repo: string | null;

  /** The chosen template's id, for GitHub's own form chooser. */
  readonly templateId: string;

  /** What was actually sent. */
  readonly sent: FeedbackSentReport;
}

/**
 * Spec item 7's way out when the report never reached GitHub.
 *
 * @param props - {@link LocalTrackerBlockProps}.
 * @returns The prefilled link where a slug allowed one, the copy
 * control and its note, and the body itself in a read-only block —
 * which is what a browser that refuses the clipboard leaves a person
 * with.
 */
function LocalTrackerBlock({
  repo,
  templateId,
  sent,
}: LocalTrackerBlockProps): ReactElement {
  const [note, setNote] = useState('');
  const href = feedbackIssueUrl({
    repo,
    templateId,
    title: sent.title,
    body: sent.body,
  });

  // `navigator.clipboard` is `undefined` outside a secure context, so
  // the read itself can throw — which is why the whole call is in the
  // try rather than guarded with `?.`, whose `undefined` would await
  // clean and report a copy that never happened.
  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(sent.body);
      setNote(COPIED_NOTE);
    } catch {
      setNote(COPY_REFUSED_NOTE);
    }
  };

  return (
    <section className="devtools-feedback-local">
      <h3 className="devtools-feedback-local-heading">{LOCAL_HEADING}</h3>

      <p className="devtools-feedback-local-hint">{LOCAL_HINT}</p>

      {href !== null && <IssueLink href={href}>{NEW_ISSUE_LABEL}</IssueLink>}

      <button
        type="button"
        className="devtools-feedback-copy"
        onClick={() => { void copy(); }}
      >
        {COPY_LABEL}
      </button>

      <p className="devtools-feedback-copy-note">{note}</p>

      <textarea
        className="devtools-feedback-copy-block"
        readOnly
        rows={COPY_ROWS}
        aria-label={COPY_LABEL}
        value={sent.body}
      />
    </section>
  );
}

/** What {@link FeedbackOutcome} takes. */
export interface FeedbackOutcomeProps {
  /** What the last call answered, or `null` before there was one. */
  readonly outcome: SubmitResult | null;

  /** What was sent, for the link and the copy block. */
  readonly sent: FeedbackSentReport | null;

  /** The `owner/name` slug, or `null`. */
  readonly repo: string | null;

  /** The chosen template's id. */
  readonly templateId: string;

  /** Whether a request is already in flight. */
  readonly busy: boolean;

  /** Say "also affected" on the matched issue. */
  readonly onAlsoAffected: (issueId: string) => void;

  /** Abandon this report. */
  readonly onDrop: () => void;
}

/**
 * Whatever the outcome brings with it, beside the status line.
 *
 * @param props - {@link FeedbackOutcomeProps}, with a settled outcome.
 * @returns The duplicate's two buttons, the local-tracker block, a
 * link to the filed issue, or nothing at all.
 */
function OutcomeActions({
  outcome,
  sent,
  repo,
  templateId,
  busy,
  onAlsoAffected,
  onDrop,
}: FeedbackOutcomeProps & { outcome: SubmitResult }): ReactNode {
  if (outcome.status === 'duplicate') {
    return (
      <DuplicateActions
        id={outcome.id}
        url={outcome.url}
        busy={busy}
        onAlsoAffected={() => { onAlsoAffected(outcome.id); }}
        onDrop={onDrop}
      />
    );
  }

  if (feedbackNeedsIssueLink(outcome) && sent !== null) {
    return (
      <LocalTrackerBlock repo={repo} templateId={templateId} sent={sent} />
    );
  }

  if (outcome.status === 'filed' && outcome.url !== undefined) {
    return (
      <IssueLink href={outcome.url}>
        {`${OPEN_ISSUE_LABEL} ${outcome.id}`}
      </IssueLink>
    );
  }

  return null;
}

/**
 * The drawer's outcome region.
 *
 * @param props - {@link FeedbackOutcomeProps}.
 * @returns The `role="status"` line — present from mount, empty until
 * something speaks — and whatever the settled outcome brings with it.
 */
export function FeedbackOutcome(props: FeedbackOutcomeProps): ReactElement {
  const { outcome } = props;

  return (
    <>
      {/* Present from mount, empty until something speaks. */}
      <p className="devtools-feedback-outcome" role="status">
        {outcome === null
          ? ''
          : describeFeedbackOutcome(outcome)}
      </p>

      {outcome !== null && <OutcomeActions {...props} outcome={outcome} />}
    </>
  );
}
