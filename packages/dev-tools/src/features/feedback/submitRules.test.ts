import type { FeedbackSelectorMatches } from './picker';
import type {
  FeedbackAttachment,
  FeedbackSelectorDraft,
  FeedbackSubmitDraft,
  FeedbackTemplateChoice,
} from './submitRules';

import { describe, expect, it } from 'vitest';

import { FEEDBACK_CAPTURE_MIME } from './capture';
import {
  FEEDBACK_ATTACHMENT_BYTES_LIMIT,
  FEEDBACK_BODY_LIMIT,
  FEEDBACK_TITLE_LIMIT,
  refuseAttachment,
  refuseBody,
  refuseSelector,
  refuseSubmit,
  refuseTemplate,
  refuseTitle,
} from './submitRules';

/**
 * ## Nothing here is stubbed, because nothing here reaches out
 *
 * Every rule in `./submitRules.ts` is a reading of its arguments, so
 * a case builds the argument and reads the answer. No document, no
 * `fetch`, no fake — the selector cases hand in the `{valid,
 * elements}` shape `./picker.ts`'s `matchesOf` answers rather than
 * running a selector, which is the whole point of the rule taking
 * matches instead of a page.
 *
 * The elements in those matches are plain `{}` cast to `Element`: the
 * rules count them and read nothing off them, and a case that built
 * real nodes would suggest they were inspected.
 *
 * ## Refusals first, each one beside the control that accepts
 *
 * Every describe block below puts its refusals ahead of its accepting
 * case, as this package's files order them. A refusal read on its own
 * is weak here — "answers a reason" is also true of a rule that
 * refuses everything — so each boundary case asserts BOTH halves in
 * one breath: 121 characters refused and 120 accepted, 5 MB + 1 byte
 * refused and exactly 5 MB accepted.
 *
 * The reason strings are pinned as text rather than as a shape.
 * `./submitRules.ts` makes every one of them fixed — no title, no
 * selector, no id is ever interpolated — so a case can hold the whole
 * sentence, and a reworded refusal reds here and is re-read rather
 * than drifting silently into the drawer.
 */

/** The served templates most cases choose from. */
const TEMPLATES: readonly FeedbackTemplateChoice[] = [
  { id: 'bug-report' },
  { id: 'ui-feedback' },
];

/** A selector's matches, as `matchesOf` would have answered them. */
function matches(count: number, valid = true): FeedbackSelectorMatches {
  return {
    valid,
    elements: Array.from({ length: count }, () => ({}) as Element),
  };
}

/**
 * A selector field holding text that matched `count` elements.
 *
 * @param value - What was typed, picked or climbed to.
 * @param count - How many pickable elements it matched.
 * @returns The draft shape the rule reads.
 */
function selectorDraft(value: string, count: number): FeedbackSelectorDraft {
  return { value, matches: matches(count) };
}

/** A file of a given type and size, with no bytes behind it. */
function attachment(type: string, size: number): FeedbackAttachment {
  return { type, size };
}

/** A draft every rule accepts, for a case to spoil one member of. */
function acceptableDraft(): FeedbackSubmitDraft {
  return {
    templateId: 'bug-report',
    templates: TEMPLATES,
    title: 'The drawer forgets the selector',
    body: '## Context\n\nIt does.',
    selector: selectorDraft('#app-root', 1),
    attachments: [attachment(FEEDBACK_CAPTURE_MIME, 1_024)],
  };
}

describe('refuseTitle', () => {
  it('refuses an empty title', () => {
    expect(refuseTitle('')).toBe('A report needs a title.');
  });

  it('refuses a title of spaces as an empty one', () => {
    expect(refuseTitle('   \t \n ')).toBe('A report needs a title.');
  });

  it('refuses a title of 121 characters and accepts one of 120', () => {
    const refused = refuseTitle('t'.repeat(FEEDBACK_TITLE_LIMIT + 1));
    const accepted = refuseTitle('t'.repeat(FEEDBACK_TITLE_LIMIT));

    expect(refused).toBe('A title is at most 120 characters.');
    expect(accepted).toBeNull();
  });

  it('counts a title in code points, not in UTF-16 units', () => {
    // 120 astral characters are 240 UTF-16 units and 120 code points,
    // and zod counts the second — measured against zod 4.6.5, the
    // version this package resolves. A rule reading `String.length`
    // would refuse this title the endpoint accepts.
    const accepted = refuseTitle('😀'.repeat(FEEDBACK_TITLE_LIMIT));
    const refused = refuseTitle('😀'.repeat(FEEDBACK_TITLE_LIMIT + 1));

    expect(accepted).toBeNull();
    expect(refused).toBe('A title is at most 120 characters.');
  });

  it('accepts an ordinary title', () => {
    expect(refuseTitle('The drawer forgets the selector')).toBeNull();
  });
});

describe('refuseBody', () => {
  it('refuses a body of 5,001 characters and accepts one of 5,000', () => {
    const refused = refuseBody('b'.repeat(FEEDBACK_BODY_LIMIT + 1));
    const accepted = refuseBody('b'.repeat(FEEDBACK_BODY_LIMIT));

    expect(refused).toBe(
      'A report is at most 5000 characters; shorten an answer and try '
      + 'again.',
    );
    expect(accepted).toBeNull();
  });

  it('accepts an empty body, which is the builder\'s to red', () => {
    expect(refuseBody('')).toBeNull();
  });

  it('accepts a built body', () => {
    expect(refuseBody('## Context\n\nIt does.')).toBeNull();
  });
});

describe('refuseTemplate', () => {
  it('refuses a template id no served template carries', () => {
    expect(refuseTemplate('feature-request', TEMPLATES)).toBe(
      'Choose one of the report types this dev server serves.',
    );
  });

  it('refuses an empty id, which is nothing chosen yet', () => {
    expect(refuseTemplate('', TEMPLATES)).toBe(
      'Choose one of the report types this dev server serves.',
    );
  });

  it('refuses every id when the dev server served no template', () => {
    expect(refuseTemplate('bug-report', [])).toBe(
      'Choose one of the report types this dev server serves.',
    );
  });

  it('accepts each served id', () => {
    expect(refuseTemplate('bug-report', TEMPLATES)).toBeNull();
    expect(refuseTemplate('ui-feedback', TEMPLATES)).toBeNull();
  });
});

describe('refuseSelector', () => {
  it('refuses a selector matching nothing', () => {
    expect(refuseSelector(selectorDraft('.missing', 0))).toBe(
      'That selector matches nothing on this page.',
    );
  });

  it('refuses a selector the browser could not read', () => {
    const unreadable = { value: 'div:::', matches: matches(0, false) };

    expect(refuseSelector(unreadable)).toBe(
      'That selector is not one the browser can read.',
    );
  });

  it('accepts a blank field and a field of spaces', () => {
    expect(refuseSelector(selectorDraft('', 0))).toBeNull();
    expect(refuseSelector(selectorDraft('   ', 0))).toBeNull();
  });

  it('accepts an absent selector field', () => {
    expect(refuseSelector(null)).toBeNull();
  });

  it('accepts a selector matching one element and one matching many', () => {
    expect(refuseSelector(selectorDraft('#app-root', 1))).toBeNull();
    expect(refuseSelector(selectorDraft('li.row', 12))).toBeNull();
  });
});

describe('refuseAttachment', () => {
  it('refuses a type outside PNG and JPEG', () => {
    expect(refuseAttachment(attachment('application/pdf', 1_024))).toBe(
      'An attachment is a PNG or a JPEG.',
    );
    expect(refuseAttachment(attachment('image/gif', 1_024))).toBe(
      'An attachment is a PNG or a JPEG.',
    );
  });

  it('refuses image/jpg, which no browser reports', () => {
    expect(refuseAttachment(attachment('image/jpg', 1_024))).toBe(
      'An attachment is a PNG or a JPEG.',
    );
  });

  it('refuses one byte over 5 MB and accepts exactly 5 MB', () => {
    // The sizes are LITERAL, and the constant is read beside them, on
    // purpose: written as `FEEDBACK_ATTACHMENT_BYTES_LIMIT + 1` alone
    // this case moves with whatever the constant becomes, and the
    // mebibyte reading it exists to pin is pinned by nothing. Measured
    // — with the boundary written symbolically, reading the constant
    // as `5_000_000` left all 31 cases green.
    const over = attachment(FEEDBACK_CAPTURE_MIME, 5_242_881);
    const at = attachment(FEEDBACK_CAPTURE_MIME, 5_242_880);

    expect(FEEDBACK_ATTACHMENT_BYTES_LIMIT).toBe(5_242_880);
    expect(refuseAttachment(over)).toBe('An attachment is at most 5 MB.');
    expect(refuseAttachment(at)).toBeNull();
  });

  it('names the type first when the type and the size are both wrong', () => {
    const both = attachment(
      'video/mp4',
      FEEDBACK_ATTACHMENT_BYTES_LIMIT + 1,
    );

    expect(refuseAttachment(both)).toBe('An attachment is a PNG or a JPEG.');
  });

  it('accepts a mime a browser reported in upper case', () => {
    expect(refuseAttachment(attachment('IMAGE/PNG', 1_024))).toBeNull();
  });

  it('accepts the captured PNG and a dropped JPEG', () => {
    expect(
      refuseAttachment(attachment(FEEDBACK_CAPTURE_MIME, 60_000)),
    ).toBeNull();
    expect(refuseAttachment(attachment('image/jpeg', 60_000))).toBeNull();
  });
});

describe('refuseSubmit', () => {
  it('answers the unknown template', () => {
    const draft = { ...acceptableDraft(), templateId: 'feature-request' };

    expect(refuseSubmit(draft)).toBe(
      'Choose one of the report types this dev server serves.',
    );
  });

  it('answers the empty title', () => {
    const draft = { ...acceptableDraft(), title: '  ' };

    expect(refuseSubmit(draft)).toBe('A report needs a title.');
  });

  it('answers the over-long body', () => {
    const draft = {
      ...acceptableDraft(),
      body: 'b'.repeat(FEEDBACK_BODY_LIMIT + 1),
    };

    expect(refuseSubmit(draft)).toBe(
      'A report is at most 5000 characters; shorten an answer and try '
      + 'again.',
    );
  });

  it('answers the selector that matches nothing', () => {
    const draft = {
      ...acceptableDraft(),
      selector: selectorDraft('.missing', 0),
    };

    expect(refuseSubmit(draft)).toBe(
      'That selector matches nothing on this page.',
    );
  });

  it('refuses the second attachment when the first is acceptable', () => {
    const draft = {
      ...acceptableDraft(),
      attachments: [
        attachment(FEEDBACK_CAPTURE_MIME, 1_024),
        attachment('application/pdf', 1_024),
      ],
    };

    expect(refuseSubmit(draft)).toBe('An attachment is a PNG or a JPEG.');
  });

  it('answers the template reason first when the template and the '
    + 'title are both wrong', () => {
    const draft = {
      ...acceptableDraft(),
      templateId: '',
      title: '',
    };

    expect(refuseSubmit(draft)).toBe(
      'Choose one of the report types this dev server serves.',
    );
  });

  it('accepts a draft every rule is happy with', () => {
    expect(refuseSubmit(acceptableDraft())).toBeNull();
  });

  it('accepts a draft with no selector and no attachment', () => {
    const draft = {
      ...acceptableDraft(),
      selector: null,
      attachments: [],
    };

    expect(refuseSubmit(draft)).toBeNull();
  });
});
