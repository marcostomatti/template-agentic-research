import type { FieldActionTable } from '../dynamic-form/actions';
import type { EnumFieldDef, FieldDef } from '../dynamic-form/fieldDef';
import type { ReportFormField } from '@ar/dev-tools/feedback';

import { describe, expect, it } from 'vitest';

import { resolveActions } from '../dynamic-form/actions';

import {
  PICK_ELEMENT_ACTION_ID,
  PICK_ELEMENT_ACTION_LABEL,
  REPORT_FORM_READONLY_LABEL,
  REPORT_FORM_ROOT_KEY,
  REPORT_FORM_ROOT_LABEL,
  adaptReportForm,
} from './reportFormAdapter';

/** A table holding the one id this mapping ever names. */
const ACTIONS: FieldActionTable = { [PICK_ELEMENT_ACTION_ID]: () => 'body' };

/** A single-line answer. */
const TITLE: ReportFormField = {
  id: 'title',
  kind: 'text',
  label: 'Title',
  description: 'One line.',
  required: true,
};

/** A multi-line answer, fenced by the body builder. */
const TRACE: ReportFormField = {
  id: 'trace',
  kind: 'textarea',
  label: 'Error message shown',
  description: 'One line.',
  render: 'shell',
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
  placeholder: 'main > section',
  required: false,
};

/** What the context block shows; asserted against the mapped option. */
const CONTEXT_VALUE = 'viewport: 1440x900\nroute: /digest';

/** The widget's always-present context block. */
const CONTEXT: ReportFormField = {
  id: 'devtools-context',
  kind: 'readonly',
  label: 'Context',
  description: 'Sent with the report.',
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

/**
 * The defs the root object holds, for a list that maps cleanly.
 *
 * @param fields - What to map.
 * @returns The mapped fields, in template order.
 */
function fieldsOf(fields: readonly ReportFormField[]): readonly FieldDef[] {
  const { defs } = adaptReportForm(fields, ACTIONS);

  if (defs.type !== 'object') {
    throw new Error(`The root is a ${defs.type}, not an object`);
  }

  return defs.fields;
}

/**
 * The one def a single-field mapping answered.
 *
 * @param field - The field to map.
 * @returns Its def.
 */
function defOf(field: ReportFormField): FieldDef {
  const [def] = fieldsOf([field]);

  if (def === undefined) {
    throw new Error('The mapping answered no def at all');
  }

  return def;
}

describe('adaptReportForm refusals', () => {
  it('refuses a field list with nothing in it', () => {
    expect(() => adaptReportForm([], ACTIONS))
      .toThrow(/at least one field/u);
  });

  it('refuses two fields mapping onto one key', () => {
    const clash: ReportFormField = { ...TITLE, label: 'Other title' };

    expect(() => adaptReportForm([TITLE, clash], ACTIONS))
      .toThrow(/map onto the key title/u);
  });

  it('refuses two boxes of one field sharing an option value', () => {
    const clash: ReportFormField = {
      ...CONFIRMATIONS,
      options: [
        { value: 'searched', label: 'I searched', required: false },
        { value: 'searched', label: 'I searched again', required: false },
      ],
    };

    expect(() => adaptReportForm([clash], ACTIONS))
      .toThrow(/map onto the key searched/u);
  });

  it('refuses a select arriving with no option', () => {
    const empty: ReportFormField = { ...SEVERITY, options: [] };

    expect(() => adaptReportForm([empty], ACTIONS))
      .toThrow(/severity is a select with no option/u);
  });

  it('refuses a checkboxes field arriving with no option', () => {
    const empty: ReportFormField = { ...CONFIRMATIONS, options: [] };

    expect(() => adaptReportForm([empty], ACTIONS))
      .toThrow(/confirmations is a checkboxes with no option/u);
  });

  it('refuses a kind it does not map, naming what arrived', () => {
    // The screenshot descriptor, which `ReportFormField` withholds:
    // a renderer cannot be handed one with types, and this is what
    // happens when something hands it one without them.
    const withheld = { id: 'shot', kind: 'file', label: 'Screenshot' };

    expect(() => adaptReportForm(
      [withheld as unknown as ReportFormField],
      ACTIONS,
    )).toThrow(/Unknown report field kind: file/u);
  });

  it('refuses an action id the table would not hold', () => {
    expect(() => adaptReportForm([SELECTOR], {}))
      .toThrow(
        `No action for field ${SELECTOR.id}: `
        + `unknown id ${PICK_ELEMENT_ACTION_ID}`,
      );
  });

  it('maps that same selector field once the table holds the id', () => {
    // The control for the refusal above: without it, a mapping that
    // refused the FIELD rather than the table would read the same.
    expect(() => adaptReportForm([SELECTOR], ACTIONS)).not.toThrow();
  });
});

describe('adaptReportForm leaves', () => {
  it('maps a text field onto a string leaf keyed by its id', () => {
    expect(defOf(TITLE)).toMatchObject({
      type: 'string',
      key: 'title',
      label: 'Title',
    });
  });

  it('carries a field description onto the def it maps to', () => {
    expect(defOf(TITLE).description).toBe('One line.');
  });

  it('maps a textarea onto the same string leaf a text field maps onto', () => {
    expect(defOf(TRACE).type).toBe('string');
  });

  it('maps a select onto an enum carrying every option in order', () => {
    const def = defOf(SEVERITY) as EnumFieldDef;

    expect(def.type).toBe('enum');
    expect(def.options).toEqual([
      { value: 'blocker', label: 'Blocker' },
      { value: 'major', label: 'Major' },
      { value: 'minor', label: 'Minor' },
    ]);
  });

  it('opens the option tuple at the template first choice', () => {
    const def = defOf(SEVERITY) as EnumFieldDef;

    // The head is the one position the tuple type distinguishes, and
    // an unanswered enum opens there.
    expect(def.options[0].value).toBe('blocker');
  });

  it('maps checkboxes onto an object of booleans keyed by option', () => {
    const def = defOf(CONFIRMATIONS);

    expect(def).toMatchObject({ type: 'object', key: 'confirmations' });
    expect(def.type === 'object' && def.fields).toEqual([
      { type: 'boolean', key: 'searched', label: 'I searched the tracker' },
      { type: 'boolean', key: 'reproduced', label: 'I reproduced it twice' },
    ]);
  });

  it('maps the selector onto a string leaf carrying the action', () => {
    expect(defOf(SELECTOR)).toMatchObject({
      type: 'string',
      key: 'devtools-selector',
      action: {
        id: PICK_ELEMENT_ACTION_ID,
        label: PICK_ELEMENT_ACTION_LABEL,
      },
    });
  });

  it('maps a readonly block onto a leaf no edit can change', () => {
    const def = defOf(CONTEXT) as EnumFieldDef;

    expect(def.type).toBe('enum');
    expect(def.options).toHaveLength(1);
    expect(def.options[0]).toEqual({
      value: CONTEXT_VALUE,
      label: CONTEXT_VALUE,
    });
  });

  it('names an unlabelled readonly block after the fallback', () => {
    const bare: ReportFormField = {
      id: 'preamble',
      kind: 'readonly',
      value: 'Fill this in before filing.',
    };

    expect(defOf(bare).label).toBe(REPORT_FORM_READONLY_LABEL);
  });

  it('draws every readonly block as an enum, over a whole template', () => {
    const types = fieldsOf(EVERY_KIND).map((def) => def.type);

    expect(types).toEqual([
      'string',
      'string',
      'enum',
      'object',
      'string',
      'enum',
    ]);
  });
});

describe('adaptReportForm output', () => {
  it('wraps the fields in one object def, in template order', () => {
    const { defs } = adaptReportForm(EVERY_KIND, ACTIONS);

    expect(defs).toMatchObject({
      type: 'object',
      key: REPORT_FORM_ROOT_KEY,
      // The one member of the wrapper the tree draws.
      label: REPORT_FORM_ROOT_LABEL,
    });
    expect(fieldsOf(EVERY_KIND).map((def) => def.key)).toEqual(
      EVERY_KIND.map((field) => field.id),
    );
  });

  it('answers the very table it was handed, not a copy', () => {
    expect(adaptReportForm(EVERY_KIND, ACTIONS).actions).toBe(ACTIONS);
  });

  it('answers a pair that names no action the table lacks', () => {
    const { defs, actions } = adaptReportForm(EVERY_KIND, ACTIONS);

    expect(resolveActions([defs], actions)).toEqual([]);
  });

  it('leaves the field list and the table it was handed untouched', () => {
    const fields: readonly ReportFormField[] = [SEVERITY, SELECTOR];
    const before = structuredClone(fields);

    adaptReportForm(fields, ACTIONS);

    expect(fields).toEqual(before);
    expect(Object.keys(ACTIONS)).toEqual([PICK_ELEMENT_ACTION_ID]);
  });
});
