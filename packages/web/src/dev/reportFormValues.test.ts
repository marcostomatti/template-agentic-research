import type { ReportFormValue } from './reportFormValues';
import type { FeedbackValues, ReportFormField } from '@ar/dev-tools/feedback';

import { describe, expect, it } from 'vitest';

import {
  drawsSelectorField,
  reportFormSchema,
  toFeedbackValues,
  toReportFormValue,
} from './reportFormValues';

/** A single-line answer. */
const TITLE: ReportFormField = {
  id: 'title',
  kind: 'text',
  label: 'Title',
  required: true,
};

/** A multi-line answer, drawn in the same box as a text field. */
const TRACE: ReportFormField = {
  id: 'trace',
  kind: 'textarea',
  label: 'Error message shown',
  required: false,
};

/** One choice out of three. */
const SEVERITY: ReportFormField = {
  id: 'severity',
  kind: 'select',
  label: 'Severity',
  required: true,
  options: [
    { value: 'blocker', label: 'Blocker' },
    { value: 'major', label: 'Major' },
    { value: 'minor', label: 'Minor' },
  ],
};

/** Two independent assertions. */
const CONFIRMATIONS: ReportFormField = {
  id: 'confirmations',
  kind: 'checkboxes',
  label: 'Before filing',
  required: false,
  options: [
    { value: 'searched', label: 'I searched the tracker', required: true },
    { value: 'reproduced', label: 'I reproduced it twice', required: false },
  ],
};

/** The widget's own element-selector field. */
const SELECTOR: ReportFormField = {
  id: 'devtools-selector',
  kind: 'selector',
  label: 'Element',
  required: false,
};

/** What the context block shows; asserted against the member. */
const CONTEXT_VALUE = 'viewport: 1440x900\nroute: /digest';

/** The widget's always-present context block. */
const CONTEXT: ReportFormField = {
  id: 'devtools-context',
  kind: 'readonly',
  label: 'Context',
  value: CONTEXT_VALUE,
};

/** Every kind a renderer is handed, in one list. */
const EVERY_KIND: readonly ReportFormField[] = [
  TITLE,
  TRACE,
  SEVERITY,
  CONFIRMATIONS,
  SELECTOR,
  CONTEXT,
];

/** Nothing answered yet, which is what a fresh drawer holds. */
const NOTHING: FeedbackValues = {};

describe('report form value refusals', () => {
  it('refuses a schema over a select arriving with no option', () => {
    const empty: ReportFormField = { ...SEVERITY, options: [] };

    expect(() => reportFormSchema([empty]))
      .toThrow(/severity is a select with no option/u);
  });

  it('refuses a schema over a checkboxes field with no option', () => {
    const empty: ReportFormField = { ...CONFIRMATIONS, options: [] };

    expect(() => reportFormSchema([empty]))
      .toThrow(/confirmations is a checkboxes with no option/u);
  });

  it('builds that same schema once the select carries an option', () => {
    // The control for the two refusals above: without it, a builder
    // that refused every select would read exactly the same.
    expect(() => reportFormSchema([SEVERITY])).not.toThrow();
  });

  it('refuses to open a kind it does not map, naming what arrived', () => {
    // The screenshot descriptor, which `ReportFormField` withholds:
    // a renderer cannot be handed one with types, and this is what
    // happens when something hands it one without them.
    const withheld = { id: 'shot', kind: 'file', label: 'Screenshot' };

    expect(() => toReportFormValue(
      [withheld as unknown as ReportFormField],
      NOTHING,
    )).toThrow(/Unknown report field kind: file/u);
  });

  it('refuses to read one back either, naming what arrived', () => {
    const withheld = { id: 'shot', kind: 'file', label: 'Screenshot' };

    expect(() => toFeedbackValues(
      [withheld as unknown as ReportFormField],
      NOTHING,
      {},
    )).toThrow(/Unknown report field kind: file/u);
  });
});

describe('toReportFormValue', () => {
  it('opens an unanswered text field at the empty string', () => {
    expect(toReportFormValue([TITLE], NOTHING)).toStrictEqual({ title: '' });
  });

  it('carries a stored answer into the box it is drawn in', () => {
    const held: FeedbackValues = { trace: 'TypeError: x is not a function' };

    expect(toReportFormValue([TRACE], held)).toStrictEqual({
      trace: 'TypeError: x is not a function',
    });
  });

  it('opens the selector field at whatever the picker wrote', () => {
    const held: FeedbackValues = { 'devtools-selector': 'main > nav' };

    expect(toReportFormValue([SELECTOR], held)).toStrictEqual({
      'devtools-selector': 'main > nav',
    });
  });

  it('opens a select at the option the record holds', () => {
    const held: FeedbackValues = { severity: 'major' };

    expect(toReportFormValue([SEVERITY], held))
      .toStrictEqual({ severity: 'major' });
  });

  it('leaves an unanswered select absent, for the provider to open', () => {
    // The member is ABSENT rather than seeded at the head option, so
    // `ChoiceField` reports the option it opened at and the record
    // says what the operator is looking at.
    expect(toReportFormValue([SEVERITY], NOTHING)).toStrictEqual({});
  });

  it('leaves a select holding a value no option carries absent', () => {
    // The empty string the package's own renderer writes for an
    // unchosen select is exactly this case.
    const held: FeedbackValues = { severity: '' };

    expect(toReportFormValue([SEVERITY], held)).toStrictEqual({});
  });

  it('opens one flag per box, keyed by the option value', () => {
    const held: FeedbackValues = { confirmations: ['reproduced'] };

    expect(toReportFormValue([CONFIRMATIONS], held)).toStrictEqual({
      confirmations: { searched: false, reproduced: true },
    });
  });

  it('opens every box off for a field nothing has ticked', () => {
    expect(toReportFormValue([CONFIRMATIONS], NOTHING)).toStrictEqual({
      confirmations: { searched: false, reproduced: false },
    });
  });

  it('opens the read-only block at the text the template gave', () => {
    expect(toReportFormValue([CONTEXT], NOTHING))
      .toStrictEqual({ 'devtools-context': CONTEXT_VALUE });
  });

  it('opens a whole template, one member per answered field', () => {
    const held: FeedbackValues = {
      title: 'The digest page scrolls twice',
      confirmations: ['searched'],
    };

    expect(toReportFormValue(EVERY_KIND, held)).toStrictEqual({
      'title': 'The digest page scrolls twice',
      'trace': '',
      'confirmations': { searched: true, reproduced: false },
      'devtools-selector': '',
      'devtools-context': CONTEXT_VALUE,
    });
  });

  it('answers a record nothing can write into', () => {
    expect(Object.isFrozen(toReportFormValue([TITLE], NOTHING))).toBe(true);
  });
});

describe('toFeedbackValues', () => {
  it('writes a typed answer back as itself', () => {
    const form: ReportFormValue = { title: 'The sidebar keeps its width' };

    expect(toFeedbackValues([TITLE], NOTHING, form))
      .toStrictEqual({ title: 'The sidebar keeps its width' });
  });

  it('reads a cleared box as the empty string', () => {
    // `readStringField` answers `null` for a box holding nothing;
    // `FeedbackValues` has only the empty string for that.
    const form: ReportFormValue = { title: null };

    expect(toFeedbackValues([TITLE], { title: 'was' }, form))
      .toStrictEqual({ title: '' });
  });

  it('writes the ticked boxes back in template order', () => {
    const form: ReportFormValue = {
      confirmations: { reproduced: true, searched: true },
    };

    expect(toFeedbackValues([CONFIRMATIONS], NOTHING, form))
      .toStrictEqual({ confirmations: ['searched', 'reproduced'] });
  });

  it('writes an unticked field back as an empty list', () => {
    const form: ReportFormValue = {
      confirmations: { searched: false, reproduced: false },
    };

    expect(toFeedbackValues([CONFIRMATIONS], NOTHING, form))
      .toStrictEqual({ confirmations: [] });
  });

  it('never writes the read-only block back into the record', () => {
    const form: ReportFormValue = { 'devtools-context': CONTEXT_VALUE };

    expect(toFeedbackValues([CONTEXT], NOTHING, form)).toStrictEqual({});
  });

  it('carries a key the form does not draw', () => {
    // The drawer replaces the whole record on every write, so a
    // selector picked while this form was unmounted — or an answer
    // left over from another template — would be lost otherwise.
    const held: FeedbackValues = { 'devtools-selector': 'main > nav' };
    const form: ReportFormValue = { title: 'A title' };

    expect(toFeedbackValues([TITLE], held, form)).toStrictEqual({
      'devtools-selector': 'main > nav',
      'title': 'A title',
    });
  });

  it('leaves the stored answer standing for a member it does not hold', () => {
    // The window between mount and `ChoiceField`'s one report.
    expect(toFeedbackValues([SEVERITY], { severity: 'minor' }, {}))
      .toStrictEqual({ severity: 'minor' });
  });

  it('reads a member of the wrong shape as unanswered', () => {
    // A throw here would land inside a change report and take the
    // widget's React root down with it.
    const form = { confirmations: 'searched' } as unknown as ReportFormValue;

    expect(() => toFeedbackValues([CONFIRMATIONS], NOTHING, form))
      .not.toThrow();
    expect(toFeedbackValues([CONFIRMATIONS], NOTHING, form))
      .toStrictEqual({});
  });

  it('reads its arguments and writes into neither', () => {
    const held: FeedbackValues = { title: 'before' };
    const form: ReportFormValue = { title: 'after' };

    toFeedbackValues([TITLE], held, form);

    expect(held).toStrictEqual({ title: 'before' });
    expect(form).toStrictEqual({ title: 'after' });
  });
});

describe('reportFormSchema', () => {
  it('accepts the record the form opens at', () => {
    const opened = toReportFormValue(EVERY_KIND, NOTHING);

    expect(reportFormSchema(EVERY_KIND).safeParse(opened).success).toBe(true);
  });

  it('accepts a cleared box', () => {
    expect(reportFormSchema([TITLE]).safeParse({ title: null }).success)
      .toBe(true);
  });

  it('accepts a select member the record does not hold yet', () => {
    expect(reportFormSchema([SEVERITY]).safeParse({}).success).toBe(true);
  });

  it('refuses a select value no option carries', () => {
    expect(reportFormSchema([SEVERITY]).safeParse({ severity: 'urgent' })
      .success).toBe(false);
  });

  it('refuses a read-only block rewritten to anything else', () => {
    const schema = reportFormSchema([CONTEXT]);

    expect(schema.safeParse({ 'devtools-context': CONTEXT_VALUE }).success)
      .toBe(true);
    expect(schema.safeParse({ 'devtools-context': 'viewport: 1x1' }).success)
      .toBe(false);
  });

  it('refuses a box holding anything but a flag', () => {
    const schema = reportFormSchema([CONFIRMATIONS]);
    const boxes = { confirmations: { searched: 'yes', reproduced: false } };

    expect(schema.safeParse(boxes).success).toBe(false);
  });
});

describe('drawsSelectorField', () => {
  it('answers false for a template that opted out of the picker', () => {
    expect(drawsSelectorField([TITLE, SEVERITY, CONTEXT])).toBe(false);
  });

  it('answers true for a template drawing the selector field', () => {
    expect(drawsSelectorField(EVERY_KIND)).toBe(true);
  });
});
