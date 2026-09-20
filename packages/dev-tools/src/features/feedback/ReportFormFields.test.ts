import type { ReportFormFieldsProps } from './ReportFormFields';
import type { ReportFormField, ReportFormRenderer } from './types';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ReportFormFields } from './ReportFormFields';

/**
 * ## Why this file is `.test.ts` and renders a `.tsx`
 *
 * The jsdom vitest project collects `.ts` only — `vitest.config.ts`
 * says why, and the rule is this package's two-runner discipline: a
 * decision lives in a module a project collects, and a component
 * stays thin. What is below is therefore not a component test in the
 * DOM-testing-library sense. Nothing is clicked and nothing is typed:
 * every case renders ONE static frame through `react-dom/server` and
 * reads the markup back, which is a reading of what the renderer
 * draws rather than of how it behaves under a keystroke. The
 * keystrokes are the forced Playwright spec's.
 *
 * The markup is read back through jsdom rather than through a regular
 * expression over the string, so a case asks the same questions an
 * assistive technology would — `for`, `aria-describedby`, the element
 * an id belongs to — instead of asking whether two substrings happen
 * to be adjacent.
 *
 * ## Refusals first
 *
 * The two `file` cases open the file: the type-level one, where
 * handing the screenshot descriptor to the slot is a `check-types`
 * error, and the runtime one, where an untyped caller that does hand
 * one over gets NO markup rather than a second file control. Spec
 * decision 4 — the PNG never leaves the machine — is what makes that
 * the first thing this file asks.
 */

/** A change reader the static renders never call. */
function ignore(): void {
  // A static frame edits nothing.
}

/**
 * Draw one frame and hand back the markup, parsed.
 *
 * @param props - What the renderer takes.
 * @returns A detached element holding the drawn rows.
 */
function draw(props: ReportFormFieldsProps): HTMLElement {
  const host = document.createElement('div');

  host.innerHTML = renderToStaticMarkup(
    createElement(ReportFormFields, props),
  );

  return host;
}

/** The summary field of a template, as the reader maps an `input`. */
const summary = {
  id: 'summary',
  kind: 'text',
  label: 'What happened?',
  description: 'One line.',
  placeholder: 'The sidebar collapses',
  required: true,
} satisfies ReportFormField;

describe('ReportFormFields, the screenshot descriptor', () => {
  it('refuses a file field at the type level', () => {
    const screenshot = {
      id: 'screenshot',
      kind: 'file',
      label: 'Screenshot',
      required: false,
    } as const;

    // @ts-expect-error `./types.ts` withholds `file` from the slot:
    // the screenshot control is the feature's own.
    const fields: readonly ReportFormField[] = [screenshot];

    expect(fields).toHaveLength(1);
  });

  it('draws nothing at all for a file field handed in untyped', () => {
    const screenshot = [{
      id: 'screenshot',
      kind: 'file',
      label: 'Screenshot',
      required: false,
    }] as unknown as readonly ReportFormField[];

    const host = draw({
      fields: screenshot,
      values: {},
      onChange: ignore,
    });

    expect(host.innerHTML).toBe('');
    expect(host.querySelector('input')).toBeNull();
    expect(host.textContent).toBe('');
  });

  it('draws the fields around a file field and not the file field', () => {
    const fields = [
      summary,
      { id: 'shot', kind: 'file', label: 'Screenshot', required: false },
    ] as unknown as readonly ReportFormField[];

    const host = draw({ fields, values: {}, onChange: ignore });

    expect(host.querySelectorAll('.devtools-field')).toHaveLength(1);
    expect(host.querySelector('input')?.id).toBe('devtools-field-summary');
  });
});

describe('ReportFormFields, a text field', () => {
  it('draws a native required attribute for no field', () => {
    const host = draw({ fields: [summary], values: {}, onChange: ignore });
    const input = host.querySelector('input');

    expect(input?.hasAttribute('required')).toBe(false);
    expect(input?.getAttribute('aria-required')).toBe('true');
  });

  it('ties the label, the description and the error slot to the control', () => {
    const host = draw({ fields: [summary], values: {}, onChange: ignore });
    const input = host.querySelector('input');

    expect(input?.id).toBe('devtools-field-summary');
    expect(host.querySelector('label')?.getAttribute('for'))
      .toBe('devtools-field-summary');
    expect(host.querySelector('label')?.textContent).toBe('What happened?');
    expect(input?.getAttribute('aria-describedby')).toBe(
      'devtools-field-summary-description devtools-field-summary-error',
    );
    expect(host.querySelector('#devtools-field-summary-description')
      ?.textContent).toBe('One line.');
    expect(input?.getAttribute('placeholder')).toBe('The sidebar collapses');
  });

  it('draws the error slot empty and the control valid with no reason', () => {
    const host = draw({ fields: [summary], values: {}, onChange: ignore });

    expect(host.querySelector('#devtools-field-summary-error')?.textContent)
      .toBe('');
    expect(host.querySelector('input')?.getAttribute('aria-invalid'))
      .toBe('false');
  });

  it('draws a reason into the slot and marks the control invalid', () => {
    const host = draw({
      fields: [summary],
      values: {},
      errors: { summary: 'A title is required.' },
      onChange: ignore,
    });

    expect(host.querySelector('#devtools-field-summary-error')?.textContent)
      .toBe('A title is required.');
    expect(host.querySelector('input')?.getAttribute('aria-invalid'))
      .toBe('true');
  });

  it('names the error slot alone where the template wrote no description', () => {
    const bare = {
      id: 'summary',
      kind: 'text',
      label: 'What happened?',
      required: false,
    } satisfies ReportFormField;

    const host = draw({ fields: [bare], values: {}, onChange: ignore });

    expect(host.querySelector('input')?.getAttribute('aria-describedby'))
      .toBe('devtools-field-summary-error');
    expect(host.querySelector('.devtools-field-description')).toBeNull();
  });

  it('shows the answer the record holds', () => {
    const host = draw({
      fields: [summary],
      values: { summary: 'The sidebar collapses on 320px' },
      onChange: ignore,
    });

    expect(host.querySelector('input')?.getAttribute('value'))
      .toBe('The sidebar collapses on 320px');
  });
});

describe('ReportFormFields, a textarea field', () => {
  const steps = {
    id: 'steps',
    kind: 'textarea',
    label: 'Steps to reproduce',
    required: false,
  } satisfies ReportFormField;

  it('draws four rows rather than the user agent\'s two', () => {
    const host = draw({ fields: [steps], values: {}, onChange: ignore });

    expect(host.querySelector('textarea')?.getAttribute('rows')).toBe('4');
    expect(host.querySelector('textarea')?.id).toBe('devtools-field-steps');
  });

  it('spell-checks prose and leaves a fenced answer alone', () => {
    const fenced = { ...steps, id: 'logs', render: 'shell' } satisfies
      ReportFormField;

    const prose = draw({ fields: [steps], values: {}, onChange: ignore });
    const code = draw({ fields: [fenced], values: {}, onChange: ignore });

    expect(prose.querySelector('textarea')?.getAttribute('spellcheck'))
      .toBe('true');
    expect(code.querySelector('textarea')?.getAttribute('spellcheck'))
      .toBe('false');
  });
});

describe('ReportFormFields, a select field', () => {
  const severity = {
    id: 'severity',
    kind: 'select',
    label: 'Severity',
    required: true,
    options: [
      { value: 'blocking', label: 'Blocking' },
      { value: 'annoying', label: 'Annoying' },
    ],
  } satisfies ReportFormField;

  it('leads with an unchosen option carrying no value', () => {
    const host = draw({ fields: [severity], values: {}, onChange: ignore });
    const options = [...host.querySelectorAll('option')];

    expect(options).toHaveLength(3);
    expect(options[0]?.getAttribute('value')).toBe('');
    expect(options[0]?.textContent).toBe('Choose one');
  });

  it('draws one option per declared choice, in order', () => {
    const host = draw({ fields: [severity], values: {}, onChange: ignore });
    const options = [...host.querySelectorAll('option')];

    expect(options.map((option) => option.getAttribute('value')))
      .toStrictEqual(['', 'blocking', 'annoying']);
    expect(options.map((option) => option.textContent))
      .toStrictEqual(['Choose one', 'Blocking', 'Annoying']);
  });

  it('marks the chosen option selected', () => {
    const host = draw({
      fields: [severity],
      values: { severity: 'annoying' },
      onChange: ignore,
    });

    const chosen = [...host.querySelectorAll('option')]
      .filter((option) => option.hasAttribute('selected'));

    expect(chosen.map((option) => option.getAttribute('value')))
      .toStrictEqual(['annoying']);
  });
});

describe('ReportFormFields, a checkboxes field', () => {
  const confirmations = {
    id: 'confirmations',
    kind: 'checkboxes',
    label: 'Before filing',
    description: 'Tick what applies.',
    required: false,
    options: [
      { value: 'searched', label: 'I searched the tracker', required: true },
      { value: 'latest', label: 'I am on the latest round', required: false },
    ],
  } satisfies ReportFormField;

  it('draws a fieldset with a legend rather than a label', () => {
    const host = draw({
      fields: [confirmations],
      values: {},
      onChange: ignore,
    });

    expect(host.querySelector('fieldset')?.getAttribute('aria-describedby'))
      .toBe(
        'devtools-field-confirmations-description '
        + 'devtools-field-confirmations-error',
      );
    expect(host.querySelector('legend')?.textContent).toBe('Before filing');
  });

  it('draws one box per option, each with its own id and label', () => {
    const host = draw({
      fields: [confirmations],
      values: {},
      onChange: ignore,
    });

    const boxes = [...host.querySelectorAll('input[type="checkbox"]')];

    expect(boxes.map((box) => box.id)).toStrictEqual([
      'devtools-field-confirmations-option-0',
      'devtools-field-confirmations-option-1',
    ]);
    expect([...host.querySelectorAll('label')].map((label) => [
      label.getAttribute('for'),
      label.textContent,
    ])).toStrictEqual([
      ['devtools-field-confirmations-option-0', 'I searched the tracker'],
      ['devtools-field-confirmations-option-1', 'I am on the latest round'],
    ]);
  });

  it('keeps a box\'s own required and ticks what the record holds', () => {
    const host = draw({
      fields: [confirmations],
      values: { confirmations: ['latest'] },
      onChange: ignore,
    });

    const boxes = [...host.querySelectorAll('input[type="checkbox"]')];

    expect(boxes.map((box) => box.getAttribute('aria-required')))
      .toStrictEqual(['true', 'false']);
    expect(boxes.map((box) => box.hasAttribute('checked')))
      .toStrictEqual([false, true]);
  });

  it('gives two options sharing a value two ids, off the position', () => {
    const repeated = {
      ...confirmations,
      options: [
        { value: 'same', label: 'First', required: false },
        { value: 'same', label: 'Second', required: false },
      ],
    } satisfies ReportFormField;

    const host = draw({ fields: [repeated], values: {}, onChange: ignore });
    const boxes = [...host.querySelectorAll('input[type="checkbox"]')];

    expect(boxes.map((box) => box.id)).toStrictEqual([
      'devtools-field-confirmations-option-0',
      'devtools-field-confirmations-option-1',
    ]);
  });
});

describe('ReportFormFields, the selector field', () => {
  const selector = {
    id: 'selector',
    kind: 'selector',
    label: 'Element',
    placeholder: '[data-testid="sidebar"]',
    required: false,
  } satisfies ReportFormField;

  it('marks the input the picker attaches to, and marks no other', () => {
    const host = draw({
      fields: [summary, selector],
      values: {},
      onChange: ignore,
    });

    const marked = [...host.querySelectorAll('[data-devtools-field]')];

    expect(marked).toHaveLength(1);
    expect(marked[0]?.getAttribute('data-devtools-field')).toBe('selector');
    expect(marked[0]?.id).toBe('devtools-field-selector');
  });

  it('draws it as a text input carrying the answer', () => {
    const host = draw({
      fields: [selector],
      values: { selector: 'main > nav' },
      onChange: ignore,
    });

    const input = host.querySelector('[data-devtools-field="selector"]');

    expect(input?.getAttribute('type')).toBe('text');
    expect(input?.getAttribute('value')).toBe('main > nav');
  });
});

describe('ReportFormFields, a readonly field', () => {
  const context = {
    id: 'context',
    kind: 'readonly',
    label: 'Context',
    value: 'url: http://localhost:5173/\nviewport: 1440x900',
  } satisfies ReportFormField;

  it('keeps the lines of the value, in a pre', () => {
    const host = draw({ fields: [context], values: {}, onChange: ignore });

    expect(host.querySelector('pre')?.textContent)
      .toBe('url: http://localhost:5173/\nviewport: 1440x900');
    expect(host.querySelector('input')).toBeNull();
    expect(host.querySelector('h3')?.textContent).toBe('Context');
  });

  it('draws no heading for a markdown block, which carries no label', () => {
    const blurb = {
      id: 'intro',
      kind: 'readonly',
      value: 'Thanks for filing.',
    } satisfies ReportFormField;

    const host = draw({ fields: [blurb], values: {}, onChange: ignore });

    expect(host.querySelector('h3')).toBeNull();
    expect(host.querySelector('pre')?.textContent).toBe('Thanks for filing.');
  });
});

describe('ReportFormFields, the whole form', () => {
  it('draws one row per field, in template order', () => {
    const host = draw({
      fields: [
        { id: 'intro', kind: 'readonly', value: 'Thanks for filing.' },
        summary,
        {
          id: 'steps',
          kind: 'textarea',
          label: 'Steps to reproduce',
          required: false,
        },
      ],
      values: {},
      onChange: ignore,
    });

    expect([...host.querySelectorAll('.devtools-field')]
      .map((row) => row.tagName.toLowerCase()))
      .toStrictEqual(['section', 'div', 'div']);
  });

  it('satisfies the renderForm slot', () => {
    const render: ReportFormRenderer = (fields, values, onChange) => (
      createElement(ReportFormFields, { fields, values, onChange })
    );

    const host = document.createElement('div');

    host.innerHTML = renderToStaticMarkup(
      render([summary], { summary: 'A title' }, ignore),
    );

    expect(host.querySelector('input')?.getAttribute('value'))
      .toBe('A title');
  });
});
