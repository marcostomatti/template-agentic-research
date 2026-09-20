import type { SubmitResult } from './submit';

import { describe, expect, it } from 'vitest';

import {
  FEEDBACK_OUTCOME_VALUE_LIMIT,
  describeFeedbackOutcome,
  feedbackIssueUrl,
  feedbackNeedsIssueLink,
  feedbackRefusal,
} from './drawerOutcome';
import { FEEDBACK_TITLE_LIMIT } from './submitRules';

/**
 * ## Nothing here is stubbed, because nothing here reaches out
 *
 * `./drawerOutcome.ts` reads a `SubmitResult` and a slug and answers
 * a sentence, a boolean and a url. So a case builds the result and
 * reads the answer.
 *
 * ## Refusals first
 *
 * The link's four refusals open the file's last block, and the
 * sentence block opens on the two results that describe a report the
 * tracker does not have. The reductions — a title carrying newlines,
 * a value past its cap — are read next, because they are what a
 * hostile or merely careless tracker answer costs.
 *
 * ## The sentences are pinned as text
 *
 * Every one of them is fixed wording around an interpolated value, so
 * a case can hold the whole line. A reworded sentence reds here and is
 * re-read, rather than drifting silently into the one region of the
 * drawer a person is told to look at.
 */

/** One control character, built rather than written. */
const BELL = String.fromCharCode(7);

/** A report the tracker took, on GitHub. */
const FILED: SubmitResult = {
  status: 'filed',
  tracker: 'github',
  id: '482',
  url: 'https://github.com/owner/name/issues/482',
};

/** A report the tracker recognised. */
const DUPLICATE: SubmitResult = {
  status: 'duplicate',
  id: '311',
  title: 'The tree loses its selection',
};

/** A report that got no further than the disk. */
const STORED: SubmitResult = {
  status: 'stored',
  path: '.rafa/feedback/q20b/2026-09-20T10-00-00-the-tree.json',
};

describe('what the outcome line says', () => {
  it('speaks a refusal\'s reason unchanged', () => {
    const reason = 'A report needs a title.';

    expect(describeFeedbackOutcome({ status: 'refused', reason }))
      .toBe(reason);
  });

  it('names the path and says the tracker did not take it', () => {
    expect(describeFeedbackOutcome(STORED)).toBe(
      'Saved on this machine at '
      + '.rafa/feedback/q20b/2026-09-20T10-00-00-the-tree.json'
      + '. It did not reach the tracker.',
    );
  });

  it('names the matched number and title of a duplicate', () => {
    expect(describeFeedbackOutcome(DUPLICATE)).toBe(
      'Already on the tracker as 311: The tree loses its selection',
    );
  });

  it('names the id and the tracker of a filed report', () => {
    expect(describeFeedbackOutcome(FILED)).toBe('Filed as 482 on github.');
  });

  it('collapses a tracker title carrying newlines onto one line', () => {
    const spoken = describeFeedbackOutcome({
      status: 'duplicate',
      id: '311',
      title: `The tree\nloses${BELL}its   selection `,
    });

    expect(spoken).toBe(
      'Already on the tracker as 311: The tree loses its selection',
    );
  });

  it('caps a title longer than the title limit', () => {
    const title = 'x'.repeat(FEEDBACK_TITLE_LIMIT + 1);
    const spoken = describeFeedbackOutcome({
      status: 'duplicate',
      id: '311',
      title,
    });

    expect(spoken).toBe(
      `Already on the tracker as 311: ${'x'.repeat(FEEDBACK_TITLE_LIMIT)}...`,
    );
  });

  it('caps a path longer than the value limit', () => {
    const path = 'p'.repeat(FEEDBACK_OUTCOME_VALUE_LIMIT + 1);
    const spoken = describeFeedbackOutcome({ status: 'stored', path });

    expect(spoken).toBe(
      'Saved on this machine at '
      + `${'p'.repeat(FEEDBACK_OUTCOME_VALUE_LIMIT)}...`
      + '. It did not reach the tracker.',
    );
  });
});

describe('whether GitHub is missing the report', () => {
  it('is false for a refusal', () => {
    expect(feedbackNeedsIssueLink({ status: 'refused', reason: 'No.' }))
      .toBe(false);
  });

  it('is false for a duplicate the tracker already has', () => {
    expect(feedbackNeedsIssueLink(DUPLICATE)).toBe(false);
  });

  it('is false for a report filed on github', () => {
    expect(feedbackNeedsIssueLink(FILED)).toBe(false);
  });

  it('is false however the tracker spelled github', () => {
    expect(feedbackNeedsIssueLink({
      status: 'filed',
      tracker: ' GitHub ',
      id: '482',
    })).toBe(false);
  });

  it('is true for a report that got no further than the disk', () => {
    expect(feedbackNeedsIssueLink(STORED)).toBe(true);
  });

  it('is true for a report filed on the local tracker', () => {
    expect(feedbackNeedsIssueLink({
      status: 'filed',
      tracker: 'local',
      id: 'fb-3',
    })).toBe(true);
  });
});

describe('the prefilled GitHub new-issue link', () => {
  /** What every accepting case below sends. */
  const REPORT = {
    templateId: 'bug-report',
    title: 'The tree loses its selection',
    body: '## Context\n\n- URL: http://localhost:5173/agents\n',
  };

  it('answers null when the server named no repository', () => {
    expect(feedbackIssueUrl({ ...REPORT, repo: null })).toBeNull();
  });

  it('answers null for the slug a checkout without an origin gives', () => {
    expect(feedbackIssueUrl({ ...REPORT, repo: 'unknown' })).toBeNull();
  });

  it('answers null for a slug carrying a third segment', () => {
    expect(feedbackIssueUrl({ ...REPORT, repo: 'owner/name/extra' }))
      .toBeNull();
  });

  it('answers null for a slug whose owner is dots alone', () => {
    expect(feedbackIssueUrl({ ...REPORT, repo: '../name' })).toBeNull();
  });

  it('answers null for a slug carrying a host', () => {
    expect(feedbackIssueUrl({
      ...REPORT,
      repo: 'https://github.com/owner/name',
    })).toBeNull();
  });

  it('names the template file, the title and the body', () => {
    expect(feedbackIssueUrl({ ...REPORT, repo: 'owner/name' })).toBe(
      'https://github.com/owner/name/issues/new'
      + '?template=bug-report.yml'
      + '&title=The+tree+loses+its+selection'
      + '&body=%23%23+Context%0A%0A-+URL%3A+http%3A%2F%2Flocalhost'
      + '%3A5173%2Fagents%0A',
    );
  });

  it('omits the template parameter when no form was chosen', () => {
    expect(feedbackIssueUrl({
      repo: 'owner/name',
      templateId: '',
      title: 'A',
      body: 'B',
    })).toBe('https://github.com/owner/name/issues/new?title=A&body=B');
  });

  it('reads a slug the server padded with spaces', () => {
    expect(feedbackIssueUrl({
      repo: ' owner/name ',
      templateId: '',
      title: 'A',
      body: 'B',
    })).toBe('https://github.com/owner/name/issues/new?title=A&body=B');
  });
});

describe('a refusal the drawer raised itself', () => {
  it('carries the reason and nothing else', () => {
    expect(feedbackRefusal('An attachment is at most 5 MB.'))
      .toStrictEqual({
        status: 'refused',
        reason: 'An attachment is at most 5 MB.',
      });
  });

  it('is frozen, like every result ./submit.ts builds', () => {
    expect(Object.isFrozen(feedbackRefusal('No.'))).toBe(true);
  });
});
