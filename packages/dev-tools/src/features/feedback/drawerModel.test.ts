import type { FeedbackContext } from './context';
import type { ReportField, ReportTemplate }
  from '../../core/reportTemplate';

import { describe, expect, it } from 'vitest';

import {
  FEEDBACK_CONTEXT_FIELD_ID,
  FEEDBACK_SCREENSHOT_FIELD_ID,
  FEEDBACK_SELECTOR_FIELD_ID,
  buildFeedbackReport,
  composeFeedbackTemplate,
  describeFeedbackContext,
  feedbackFormFields,
  feedbackScreenshotField,
  feedbackSelectorValue,
} from './drawerModel';

/**
 * ## Nothing here is stubbed, because nothing here reaches out
 *
 * `./drawerModel.ts` is pure: it reads a template, a context record
 * and an answers record, and answers new values. So a case builds the
 * three and reads what came back — no document, no `fetch`, no fake.
 *
 * The templates below are written as literals rather than parsed
 * through `../../core/reportTemplate.ts`'s schema. The module under
 * test takes the PARSED shape, so a case that parsed first would be
 * reading the schema's defaults as well as this module's composition
 * and a refusal in either would red the same case.
 *
 * ## Refusals first
 *
 * This module refuses nothing — it has no reasons to answer. What
 * comes first instead is what it WITHHOLDS and what it DROPS: the
 * screenshot descriptor the renderer slot never sees, the template
 * field that tried to take one of the widget's three ids, and the
 * `attachments` key that is absent rather than empty. All three are
 * absences, and an absence is the thing a later edit removes without
 * failing anything else.
 *
 * `toStrictEqual` is used wherever an absence is the reading:
 * `toEqual` passes on `{attachments: undefined}` and this module's
 * whole point there is that the key is not written.
 */

/** The context record most cases show in the read-only block. */
const CONTEXT: FeedbackContext = {
  url: 'http://localhost:5173/agents',
  viewport: '1440x900',
  commit: 'abc1234',
};

/** One ordinary template field, in every fixture below. */
const QUESTION: ReportField = {
  id: 'what-looks-wrong',
  kind: 'textarea',
  label: 'What looks wrong',
  required: true,
};

/**
 * A served template.
 *
 * @param devtools - Which of the widget's own fields it takes.
 * @param fields - Its own fields; the one question by default.
 * @returns The template, as `GET <endpoint>/templates` answers one.
 */
function template(
  devtools: { screenshot: boolean; selector: boolean },
  fields: readonly ReportField[] = [QUESTION],
): ReportTemplate {
  return {
    id: 'ui-feedback',
    name: 'UI feedback',
    description: 'Something on the page looks wrong.',
    module: 'web',
    fields: [...fields],
    devtools: { ...devtools, context: true },
  };
}

/**
 * The ids of a template's fields, in order.
 *
 * @param fields - Whatever answered them.
 * @returns One id per field.
 */
function idsOf(fields: readonly { id: string }[]): readonly string[] {
  return fields.map((field) => field.id);
}

describe('the fields the renderer slot is handed', () => {
  it('withholds the screenshot descriptor', () => {
    const composed = composeFeedbackTemplate(
      template({ screenshot: true, selector: true }),
      CONTEXT,
    );

    expect(idsOf(feedbackFormFields(composed))).toStrictEqual([
      QUESTION.id,
      FEEDBACK_SELECTOR_FIELD_ID,
      FEEDBACK_CONTEXT_FIELD_ID,
    ]);
  });

  it('keeps the selector field and the read-only context block', () => {
    const composed = composeFeedbackTemplate(
      template({ screenshot: false, selector: true }),
      CONTEXT,
    );
    const kinds = feedbackFormFields(composed).map((field) => field.kind);

    expect(kinds).toStrictEqual(['textarea', 'selector', 'readonly']);
  });
});

describe('the composed template', () => {
  it('drops a template field that took one of the widget\'s ids', () => {
    const impostor: ReportField = {
      id: FEEDBACK_CONTEXT_FIELD_ID,
      kind: 'text',
      label: 'Any other context',
      required: false,
    };
    const composed = composeFeedbackTemplate(
      template({ screenshot: false, selector: false }, [QUESTION, impostor]),
      CONTEXT,
    );
    const block = composed.fields.filter(
      (field) => field.id === FEEDBACK_CONTEXT_FIELD_ID,
    );

    expect(idsOf(composed.fields)).toStrictEqual([
      QUESTION.id,
      FEEDBACK_CONTEXT_FIELD_ID,
    ]);
    expect(block).toHaveLength(1);
    expect(block[0]?.kind).toBe('readonly');
  });

  it('leaves the served template untouched', () => {
    const served = template({ screenshot: true, selector: true });

    composeFeedbackTemplate(served, CONTEXT);

    expect(idsOf(served.fields)).toStrictEqual([QUESTION.id]);
  });

  it('appends the selector, the screenshot and the context block', () => {
    const composed = composeFeedbackTemplate(
      template({ screenshot: true, selector: true }),
      CONTEXT,
    );

    expect(idsOf(composed.fields)).toStrictEqual([
      QUESTION.id,
      FEEDBACK_SELECTOR_FIELD_ID,
      FEEDBACK_SCREENSHOT_FIELD_ID,
      FEEDBACK_CONTEXT_FIELD_ID,
    ]);
  });

  it('omits the selector where the template opted out', () => {
    const composed = composeFeedbackTemplate(
      template({ screenshot: true, selector: false }),
      CONTEXT,
    );

    expect(idsOf(composed.fields)).toStrictEqual([
      QUESTION.id,
      FEEDBACK_SCREENSHOT_FIELD_ID,
      FEEDBACK_CONTEXT_FIELD_ID,
    ]);
  });

  it('keeps the context block where the template opted out of both', () => {
    const composed = composeFeedbackTemplate(
      template({ screenshot: false, selector: false }),
      CONTEXT,
    );

    expect(idsOf(composed.fields)).toStrictEqual([
      QUESTION.id,
      FEEDBACK_CONTEXT_FIELD_ID,
    ]);
  });

  it('marks the selector field as the kind both renderers mark', () => {
    const composed = composeFeedbackTemplate(
      template({ screenshot: true, selector: true }),
      CONTEXT,
    );
    const field = composed.fields.find(
      (candidate) => candidate.id === FEEDBACK_SELECTOR_FIELD_ID,
    );

    expect(field?.kind).toBe('selector');
  });
});

describe('the read-only context block', () => {
  it('answers a sentence where nothing was collected', () => {
    expect(describeFeedbackContext({})).toBe('Nothing was collected.');
  });

  it('writes one key and value per line, in the record\'s order', () => {
    expect(describeFeedbackContext(CONTEXT)).toBe(
      'url: http://localhost:5173/agents\nviewport: 1440x900\n'
      + 'commit: abc1234',
    );
  });

  it('writes a number and a boolean as themselves', () => {
    expect(describeFeedbackContext({ ratio: 2, dark: false })).toBe(
      'ratio: 2\ndark: false',
    );
  });

  it('is what the composed block carries', () => {
    const composed = composeFeedbackTemplate(
      template({ screenshot: false, selector: false }),
      CONTEXT,
    );
    const block = composed.fields.find(
      (field) => field.id === FEEDBACK_CONTEXT_FIELD_ID,
    );

    expect(block?.kind === 'readonly' && block.value)
      .toBe(describeFeedbackContext(CONTEXT));
  });
});

describe('the screenshot descriptor', () => {
  it('answers null where the template opted out', () => {
    const composed = composeFeedbackTemplate(
      template({ screenshot: false, selector: true }),
      CONTEXT,
    );

    expect(feedbackScreenshotField(composed)).toBeNull();
  });

  it('answers the appended descriptor', () => {
    const composed = composeFeedbackTemplate(
      template({ screenshot: true, selector: false }),
      CONTEXT,
    );

    expect(feedbackScreenshotField(composed)).toStrictEqual({
      id: FEEDBACK_SCREENSHOT_FIELD_ID,
      kind: 'file',
      label: 'Screenshot',
      description:
        'A frame of what you are looking at, captured, dropped or chosen.',
      required: false,
    });
  });
});

describe('the selector field\'s answer', () => {
  it('answers an empty string when the field is unanswered', () => {
    expect(feedbackSelectorValue({})).toBe('');
  });

  it('answers an empty string when the record holds a list', () => {
    expect(feedbackSelectorValue({
      [FEEDBACK_SELECTOR_FIELD_ID]: ['a', 'b'],
    })).toBe('');
  });

  it('answers what was typed, picked or climbed to', () => {
    expect(feedbackSelectorValue({
      [FEEDBACK_SELECTOR_FIELD_ID]: '[data-testid="tree"] button',
      'what-looks-wrong': 'The tree',
    })).toBe('[data-testid="tree"] button');
  });
});

describe('the assembled report', () => {
  /** What every case below sends. */
  const INPUT = {
    feature: 'feedback',
    title: 'The tree loses its selection',
    body: '## Context\n\n- URL: http://localhost:5173/agents\n',
    context: CONTEXT,
  };

  it('omits attachments entirely when there is no image', () => {
    expect(buildFeedbackReport({ ...INPUT, attachment: null }))
      .toStrictEqual({
        feature: 'feedback',
        title: INPUT.title,
        body: INPUT.body,
        context: CONTEXT,
      });
  });

  it('carries the one attachment when there is one', () => {
    const attachment = {
      name: 'screenshot.png',
      mime: 'image/png',
      base64: 'aGk=',
    };

    expect(buildFeedbackReport({ ...INPUT, attachment })).toStrictEqual({
      feature: 'feedback',
      title: INPUT.title,
      body: INPUT.body,
      context: CONTEXT,
      attachments: [attachment],
    });
  });

  it('sends the title exactly as typed, untrimmed', () => {
    const report = buildFeedbackReport({
      ...INPUT,
      title: '  padded  ',
      attachment: null,
    });

    expect(report.title).toBe('  padded  ');
  });

  it('freezes what it answers', () => {
    const report = buildFeedbackReport({ ...INPUT, attachment: null });

    expect(Object.isFrozen(report)).toBe(true);
  });
});
