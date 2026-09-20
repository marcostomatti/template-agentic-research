import type { FeedbackBodyInput, FeedbackValues } from './body';
import type { FeedbackContext } from './context';
import type { FeedbackElementDescription } from './picker';
import type { ReportTemplate } from '../../core/reportTemplate';

import { describe, expect, it } from 'vitest';

import { reportTemplateSchema } from '../../core/reportTemplate';

import { buildFeedbackBody } from './body';

/**
 * ## Nothing is stubbed, because nothing is reached
 *
 * `./body.ts` reads its one argument and answers a string. There is
 * no document, no clock and no `fetch` to fake — a case builds a
 * template, some answers and a context record, and reads the
 * Markdown. The element description is the plain `{selector, tag,
 * text, rect}` shape `./picker.ts` answers, built by hand rather than
 * measured off a node, because the builder rounds and quotes what it
 * is handed and inspects nothing else.
 *
 * ## Templates are built through the schema, not beside it
 *
 * {@link template} parses its fixture with
 * `src/core/reportTemplate.ts`'s own schema, so a fixture that could
 * not be served by the dev server reds here rather than silently
 * exercising a shape the builder will never meet. It also fills the
 * defaults — `required`, the `devtools` block — which is what the
 * drawer will hand over.
 *
 * ## What is omitted comes first
 *
 * This package orders every test file refusals first, and for a
 * builder the refusals are the omissions: the fields that produce no
 * section at all. They sit ahead of the order pin and of every
 * rendering case, and each one asserts BOTH halves where it can — the
 * empty field absent and the answered field present in the same body
 * — because "the heading is missing" is also true of a builder that
 * renders nothing.
 *
 * ## The order is read with the same expression the module documents
 *
 * {@link headings} is `/^## /` over the whole document, which is what
 * `./body.ts` says the flat heading level is for. A case that read
 * the sections by splitting on a hand-written separator could pass
 * over a document a reader could not navigate.
 */

/** The collected record most cases carry. */
const CONTEXT: FeedbackContext = {
  viewportWidth: 1280,
  viewportHeight: 720,
  devicePixelRatio: 2,
  colorScheme: 'dark',
  userAgent: 'Mozilla/5.0 (Macintosh)',
  url: 'http://localhost:5173/agents',
  commit: 'a1b2c3d',
  branch: 'q20b-2',
  round: '7',
  api: 'unknown',
};

/** The element the picker would have described. */
const ELEMENT: FeedbackElementDescription = {
  selector: '[data-testid="agent-row"]',
  tag: 'button',
  text: 'Open the agent',
  rect: { x: 10.4, y: 20.6, width: 120.5, height: 40.2 },
};

/**
 * Parse a fixture into a real template.
 *
 * @param fields - The body items, in the order they are drawn.
 * @returns The template, defaults filled by the schema.
 */
function template(fields: readonly unknown[]): ReportTemplate {
  return reportTemplateSchema.parse({
    id: 'bug-report',
    name: 'Bug report',
    description: 'Something is broken.',
    module: 'web',
    fields,
  });
}

/** A template of one single-line field. */
function oneTextField(): ReportTemplate {
  return template([{ kind: 'text', id: 'what', label: 'What happened' }]);
}

/**
 * Build a body over the shared context record.
 *
 * @param fields - The template's body items.
 * @param values - What the form holds.
 * @param extra - Anything else the builder reads.
 * @returns The Markdown document.
 */
function build(
  fields: readonly unknown[],
  values: FeedbackValues,
  extra: Partial<FeedbackBodyInput> = {},
): string {
  return buildFeedbackBody({
    template: template(fields),
    values,
    context: CONTEXT,
    ...extra,
  });
}

/** Every `##` heading of a document, in order. */
function headings(body: string): readonly string[] {
  return body.match(/^## .*$/gmu) ?? [];
}

/** The line of a document that starts with some prefix. */
function line(body: string, prefix: string): string | undefined {
  return body.split('\n').find((candidate) => candidate.startsWith(prefix));
}

/**
 * The text inside the fenced `json` block.
 *
 * The opening fence is whatever run of backticks the builder chose,
 * and the closing one is the same run on its own line — CommonMark's
 * rule, and the reason this reads the fence rather than assuming
 * three.
 *
 * @param body - The whole document.
 * @returns The block's content.
 */
function fencedRecord(body: string): string {
  const matched = /^(`{3,})json\n([\s\S]*?)\n\1$/mu.exec(body);

  if (matched?.[2] === undefined) {
    throw new Error('The body carries no fenced json block.');
  }

  return matched[2];
}

describe('buildFeedbackBody — what it leaves out', () => {
  it('omits a field nobody answered, and keeps the one answered', () => {
    const body = build(
      [
        { kind: 'text', id: 'what', label: 'What happened' },
        { kind: 'textarea', id: 'steps', label: 'Steps to reproduce' },
      ],
      { what: 'The drawer forgets the selector' },
    );

    expect(headings(body)).not.toContain('## Steps to reproduce');
    expect(headings(body)).toContain('## What happened');
  });

  it('omits a field holding nothing but whitespace', () => {
    const body = build(
      [{ kind: 'text', id: 'what', label: 'What happened' }],
      { what: '  \t \n ' },
    );

    expect(headings(body)).not.toContain('## What happened');
  });

  it('omits a checkboxes field with nothing ticked', () => {
    const body = build(
      [
        {
          kind: 'checkboxes',
          id: 'confirm',
          label: 'Before filing',
          options: [{ value: 'searched', label: 'I searched the tracker' }],
        },
      ],
      { confirm: [] },
    );

    expect(headings(body)).not.toContain('## Before filing');
  });

  it('omits a value of the wrong shape for its kind', () => {
    const body = build(
      [{ kind: 'text', id: 'what', label: 'What happened' }],
      { what: ['one', 'two'] },
    );

    expect(headings(body)).not.toContain('## What happened');
  });

  it('omits the readonly, file and selector fields entirely', () => {
    const body = build(
      [
        { kind: 'readonly', id: 'intro', label: 'Read me', value: 'Hello.' },
        { kind: 'file', id: 'shot', label: 'Screenshot' },
        { kind: 'selector', id: 'target', label: 'Element' },
        { kind: 'text', id: 'what', label: 'What happened' },
      ],
      { what: 'It broke', target: '#app', shot: 'shot.png' },
    );

    expect(headings(body)).toStrictEqual([
      '## Context',
      '## What happened',
      '## Environment',
      '## Context record',
    ]);
  });

  it('leaves no blank run where a middle field was omitted', () => {
    const body = build(
      [
        { kind: 'text', id: 'what', label: 'What happened' },
        { kind: 'text', id: 'steps', label: 'Steps to reproduce' },
        { kind: 'text', id: 'expected', label: 'Expected' },
      ],
      { what: 'It broke', expected: 'It works' },
    );

    expect(body).not.toContain('\n\n\n');
  });
});

describe('buildFeedbackBody — the section order', () => {
  it('pins Context, the answered fields, Environment, the record', () => {
    const body = build(
      [
        { kind: 'text', id: 'what', label: 'What happened' },
        { kind: 'textarea', id: 'steps', label: 'Steps to reproduce' },
      ],
      { what: 'It broke', steps: 'Open the drawer.' },
    );

    expect(headings(body)).toStrictEqual([
      '## Context',
      '## What happened',
      '## Steps to reproduce',
      '## Environment',
      '## Context record',
    ]);
  });

  it('keeps the first and last sections when no field is answered', () => {
    const body = build(
      [{ kind: 'text', id: 'what', label: 'What happened' }],
      {},
    );

    expect(headings(body)).toStrictEqual([
      '## Context',
      '## Environment',
      '## Context record',
    ]);
  });

  it('draws the fields in template order, not in answer order', () => {
    const body = build(
      [
        { kind: 'text', id: 'what', label: 'What happened' },
        { kind: 'text', id: 'steps', label: 'Steps to reproduce' },
      ],
      { steps: 'Open the drawer.', what: 'It broke' },
    );

    expect(headings(body)).toStrictEqual([
      '## Context',
      '## What happened',
      '## Steps to reproduce',
      '## Environment',
      '## Context record',
    ]);
  });

  it('ends with exactly one newline', () => {
    const body = buildFeedbackBody({
      template: oneTextField(),
      values: { what: 'It broke' },
      context: CONTEXT,
    });

    expect(body.endsWith('\n')).toBe(true);
    expect(body.endsWith('\n\n')).toBe(false);
  });
});

describe('buildFeedbackBody — the Context section', () => {
  it('writes unknown as the URL when the record carries none', () => {
    const without = buildFeedbackBody({
      template: oneTextField(),
      values: {},
      context: { commit: 'a1b2c3d' },
    });
    const present = buildFeedbackBody({
      template: oneTextField(),
      values: {},
      context: CONTEXT,
    });

    expect(line(without, '- URL:')).toBe('- URL: unknown');
    expect(line(present, '- URL:'))
      .toBe('- URL: http://localhost:5173/agents');
  });

  it('writes no selector line where nothing was typed or picked', () => {
    const body = build(
      [{ kind: 'selector', id: 'target', label: 'Element' }],
      { target: '   ' },
      { element: null },
    );

    expect(line(body, '- Selector:')).toBeUndefined();
    expect(line(body, '- Element:')).toBeUndefined();
  });

  it('prefers the field selector over the described element', () => {
    const body = build(
      [{ kind: 'selector', id: 'target', label: 'Element' }],
      { target: 'main > section' },
      { element: ELEMENT },
    );

    expect(line(body, '- Selector:')).toBe('- Selector: `main > section`');
  });

  it('falls back to the element selector when the field is blank', () => {
    const body = build(
      [{ kind: 'selector', id: 'target', label: 'Element' }],
      { target: '' },
      { element: ELEMENT },
    );

    expect(line(body, '- Selector:'))
      .toBe('- Selector: `[data-testid="agent-row"]`');
  });

  it('writes the element tag, its text and its rounded box', () => {
    const body = build([], {}, { element: ELEMENT });

    expect(line(body, '- Element:')).toBe('- Element: `button`');
    expect(line(body, '- Text:')).toBe('- Text: "Open the agent"');
    expect(line(body, '- Box:')).toBe('- Box: 121x40 at (10, 21)');
  });

  it('writes no text line for an element carrying no text', () => {
    const body = build([], {}, {
      element: { ...ELEMENT, text: '  \n ' },
    });

    expect(line(body, '- Text:')).toBeUndefined();
    expect(line(body, '- Box:')).toBe('- Box: 121x40 at (10, 21)');
  });

  it('lengthens a code span around a selector holding a backtick', () => {
    const body = build(
      [{ kind: 'selector', id: 'target', label: 'Element' }],
      { target: '[data-label="`"]' },
      { element: null },
    );

    expect(line(body, '- Selector:'))
      .toBe('- Selector: ``[data-label="`"]``');
  });
});

describe('buildFeedbackBody — the answered fields', () => {
  it('writes a chosen option by its label', () => {
    const body = build(
      [
        {
          kind: 'select',
          id: 'severity',
          label: 'Severity',
          options: [
            { value: 'blocking', label: 'Blocks the round' },
            { value: 'minor', label: 'Minor' },
          ],
        },
      ],
      { severity: 'blocking' },
    );

    expect(body).toContain('## Severity\n\nBlocks the round\n');
  });

  it('writes a value no option carries rather than dropping it', () => {
    const body = build(
      [
        {
          kind: 'select',
          id: 'severity',
          label: 'Severity',
          options: [{ value: 'minor', label: 'Minor' }],
        },
      ],
      { severity: 'blocking' },
    );

    expect(body).toContain('## Severity\n\nblocking\n');
  });

  it('lists the ticked boxes by their labels', () => {
    const body = build(
      [
        {
          kind: 'checkboxes',
          id: 'confirm',
          label: 'Before filing',
          options: [
            { value: 'searched', label: 'I searched the tracker' },
            { value: 'reproduced', label: 'I reproduced it twice' },
          ],
        },
      ],
      { confirm: ['reproduced', 'searched'] },
    );

    expect(body).toContain(
      '## Before filing\n\n- I reproduced it twice\n- I searched the '
      + 'tracker\n',
    );
  });

  it('reads a single ticked box handed over as a bare string', () => {
    const body = build(
      [
        {
          kind: 'checkboxes',
          id: 'confirm',
          label: 'Before filing',
          options: [{ value: 'searched', label: 'I searched the tracker' }],
        },
      ],
      { confirm: 'searched' },
    );

    expect(body).toContain('## Before filing\n\n- I searched the tracker\n');
  });

  it('fences a textarea the template declared a render language for', () => {
    const body = build(
      [
        {
          kind: 'textarea',
          id: 'log',
          label: 'Error message',
          render: 'shell',
        },
      ],
      { log: 'TypeError: x is not a function\n  at run (app.js:1:1)' },
    );

    expect(body).toContain(
      '## Error message\n\n```shell\nTypeError: x is not a function\n'
      + '  at run (app.js:1:1)\n```\n',
    );
  });

  it('lengthens that fence around an answer holding one of its own', () => {
    const body = build(
      [
        {
          kind: 'textarea',
          id: 'log',
          label: 'Error message',
          render: 'shell',
        },
      ],
      { log: 'before\n```\nafter' },
    );

    expect(body).toContain(
      '## Error message\n\n````shell\nbefore\n```\nafter\n````\n',
    );
  });

  it('keeps the newlines of a textarea with no render language', () => {
    const body = build(
      [{ kind: 'textarea', id: 'steps', label: 'Steps to reproduce' }],
      { steps: '1. Open the drawer.\n2. Pick an element.' },
    );

    expect(body).toContain(
      '## Steps to reproduce\n\n1. Open the drawer.\n2. Pick an element.\n',
    );
  });
});

describe('buildFeedbackBody — the Environment table', () => {
  it('writes a sentence where the record held nothing', () => {
    const empty = buildFeedbackBody({
      template: oneTextField(),
      values: {},
      context: {},
    });

    expect(empty).toContain('## Environment\n\n_Nothing was collected._\n');
    expect(empty).not.toContain('| Key | Value |');
  });

  it('writes one row per key, in the record order', () => {
    const body = buildFeedbackBody({
      template: oneTextField(),
      values: {},
      context: { url: 'http://localhost:5173/', commit: 'a1b2c3d' },
    });

    expect(body).toContain(
      '## Environment\n\n| Key | Value |\n| --- | --- |\n'
      + '| url | http://localhost:5173/ |\n| commit | a1b2c3d |\n',
    );
  });

  it('writes a boolean and a number as themselves', () => {
    const body = buildFeedbackBody({
      template: oneTextField(),
      values: {},
      context: { devicePixelRatio: 2, offline: false },
    });

    expect(body).toContain('| devicePixelRatio | 2 |\n| offline | false |');
  });

  it('escapes a pipe and a backslash, and flattens a newline', () => {
    const body = buildFeedbackBody({
      template: oneTextField(),
      values: {},
      context: { note: 'a | b \\ c\nsecond line' },
    });

    expect(body).toContain('| note | a \\| b \\\\ c second line |');
  });
});

describe('buildFeedbackBody — the fenced record', () => {
  it('parses back to the record it was built from', () => {
    const body = buildFeedbackBody({
      template: oneTextField(),
      values: { what: 'It broke' },
      context: CONTEXT,
    });

    expect(JSON.parse(fencedRecord(body))).toStrictEqual(CONTEXT);
  });

  it('parses back when a value holds a fence of its own', () => {
    const context: FeedbackContext = {
      url: 'http://localhost:5173/',
      error: 'SyntaxError in ```ts\nconst x = 1;\n```',
    };
    const body = buildFeedbackBody({
      template: oneTextField(),
      values: {},
      context,
    });

    expect(JSON.parse(fencedRecord(body))).toStrictEqual(context);
  });

  it('parses back an empty record', () => {
    const body = buildFeedbackBody({
      template: oneTextField(),
      values: {},
      context: {},
    });

    expect(JSON.parse(fencedRecord(body))).toStrictEqual({});
  });
});
