import type { ReportTemplate } from './reportTemplate';

import { describe, expect, it } from 'vitest';

import {
  REPORT_TEMPLATE_DEVTOOLS_DEFAULTS,
  reportFieldSchema,
  reportTemplateListSchema,
  reportTemplateSchema,
} from './reportTemplate';

/**
 * ## Why there is no fixture file, no YAML and no filesystem here
 *
 * `reportTemplate.ts` holds schemas and nothing else, so a case is an
 * object literal and a `safeParse`. Reading a `.github/ISSUE_TEMPLATE/
 * *.yml` belongs to `src/vite/templates.ts` and is proved by that
 * module's own node cases; a fixture here would test the reader
 * through this module and say nothing about either.
 *
 * ## Why so many refusals carry a positive control
 *
 * Every refusal is a parse answering `success: false`, and a schema
 * hard-wired to refuse everything would pass all of them. So each
 * refusal that could read as a false negative is paired with the ONE
 * edit that should make it parse — one option instead of none, a
 * second field id that differs, a module that is present — and the
 * same call is asserted to succeed.
 *
 * ## Why the messages are spelled out rather than imported
 *
 * `SELECT_OPTIONS_REQUIRED` and its siblings are private to
 * `reportTemplate.ts`. Importing them would make these cases restate
 * whatever the module currently says; spelled here, a message reworded
 * in the module reds a case instead of moving with it. The same goes
 * for the seven kinds in the discriminator message, which is the one
 * assertion that pins the union's membership and its order.
 *
 * Refusals run before accepting cases, which is this plan's order for
 * every test file.
 */

/** A field that passes every rule; each case varies one thing. */
const VALID_FIELD = Object.freeze({
  kind: 'text',
  id: 'what-happened',
  label: 'What happened',
});

/** A template that passes every rule; each case varies one thing. */
const VALID_TEMPLATE = Object.freeze({
  id: 'bug-report',
  name: 'Bug report',
  description: 'Something in the app behaves wrong, breaks, or errors.',
  module: 'web',
  fields: Object.freeze([VALID_FIELD]),
});

/** One well-formed field of every kind, keyed by that kind. */
const ONE_OF_EACH_KIND: Readonly<Record<string, unknown>> = Object.freeze({
  text: VALID_FIELD,
  textarea: {
    kind: 'textarea',
    id: 'steps-to-reproduce',
    label: 'Steps to reproduce',
    render: 'shell',
  },
  select: {
    kind: 'select',
    id: 'severity',
    label: 'Severity',
    options: [{ value: 'blocker', label: 'blocker' }],
  },
  checkboxes: {
    kind: 'checkboxes',
    id: 'confirmations',
    label: 'Before filing',
    options: [{ value: 'searched', label: 'I searched', required: true }],
  },
  file: {
    kind: 'file',
    id: 'screenshot',
    label: 'Screenshot',
  },
  selector: {
    kind: 'selector',
    id: 'element',
    label: 'Element',
  },
  readonly: {
    kind: 'readonly',
    id: 'context',
    label: 'Context',
    value: 'route=/lexicon width=320',
  },
});

/**
 * The keys a parsed template carries, sorted.
 *
 * Typed as `keyof ReportTemplate`, so the two directions are covered
 * by different mechanisms: a key DROPPED from the type reds at
 * compile time on this declaration, and a key ADDED to the schema reds
 * at run time on the `Object.keys` comparison below.
 */
const TEMPLATE_KEYS: readonly (keyof ReportTemplate)[] = [
  'description',
  'devtools',
  'fields',
  'id',
  'module',
  'name',
];

/**
 * The first issue of a refused parse, as a path and a message.
 *
 * @param parse - What a `safeParse` answered.
 * @returns The dotted path and the message, or `null` when the parse
 * succeeded — asserted against rather than thrown on, so a case that
 * unexpectedly PASSES reds with its own name instead of with a helper's
 * stack.
 */
function firstIssue(
  parse: { success: boolean; error?: { issues: readonly { path: readonly PropertyKey[]; message: string }[] } },
): { path: string; message: string } | null {
  const issue = parse.error?.issues[0];

  if (issue === undefined) {
    return null;
  }

  return {
    path: issue.path.map((segment) => String(segment)).join('.'),
    message: issue.message,
  };
}

describe('what reportFieldSchema refuses', () => {
  it('refuses a select declaring no option and accepts one option', () => {
    // Arrange
    const empty = { kind: 'select', id: 'severity', label: 'Severity', options: [] };

    // Act
    const refused = reportFieldSchema.safeParse(empty);
    const accepted = reportFieldSchema.safeParse({
      ...empty,
      options: [{ value: 'blocker', label: 'blocker' }],
    });

    // Assert
    expect(firstIssue(refused)).toEqual({
      path: 'options',
      message:
        'A select declares at least one option; a select with none is '
        + 'refused rather than mapped.',
    });
    expect(accepted.success).toBe(true);
  });

  it('refuses a select with no options key at all', () => {
    // Arrange: the key is ABSENT, not an empty list — what a form
    // author who forgot the block actually writes.
    const input = { kind: 'select', id: 'severity', label: 'Severity' };

    // Act
    const parse = reportFieldSchema.safeParse(input);

    // Assert
    expect(parse.success).toBe(false);
    expect(firstIssue(parse)?.path).toBe('options');
  });

  it('refuses a checkboxes declaring no option, naming that kind', () => {
    // Arrange
    const empty = { kind: 'checkboxes', id: 'confirm', label: 'Before filing', options: [] };

    // Act
    const refused = reportFieldSchema.safeParse(empty);
    const accepted = reportFieldSchema.safeParse({
      ...empty,
      options: [{ value: 'searched', label: 'I searched' }],
    });

    // Assert: its own message, so a refusal says which kind failed.
    expect(firstIssue(refused)).toEqual({
      path: 'options',
      message:
        'A checkboxes field declares at least one option; a checkboxes '
        + 'field with none is refused rather than mapped.',
    });
    expect(accepted.success).toBe(true);
  });

  it('refuses a kind outside the seven, naming all seven', () => {
    // Arrange
    const input = { kind: 'colour', id: 'accent', label: 'Accent' };

    // Act
    const parse = reportFieldSchema.safeParse(input);

    // Assert: the one assertion that pins the union's membership.
    expect(firstIssue(parse)).toEqual({
      path: 'kind',
      message:
        'Invalid discriminator value. Expected \'text\' | \'textarea\' '
        + '| \'select\' | \'checkboxes\' | \'file\' | \'selector\' | '
        + '\'readonly\'',
    });
  });

  it('refuses a field id that is not an identifier', () => {
    // Act
    const refused = reportFieldSchema.safeParse({
      ...VALID_FIELD,
      id: 'what happened?',
    });
    const accepted = reportFieldSchema.safeParse({
      ...VALID_FIELD,
      id: 'what_happened.2-b',
    });

    // Assert
    expect(firstIssue(refused)).toEqual({
      path: 'id',
      message: 'A field id is an identifier.',
    });
    expect(accepted.success).toBe(true);
  });

  it('refuses an empty label and accepts a one-character label', () => {
    // Act
    const refused = reportFieldSchema.safeParse({ ...VALID_FIELD, label: '' });
    const accepted = reportFieldSchema.safeParse({ ...VALID_FIELD, label: 'A' });

    // Assert
    expect(firstIssue(refused)?.path).toBe('label');
    expect(accepted.success).toBe(true);
  });

  it('refuses a readonly field carrying no value', () => {
    // Arrange: readonly is the one kind whose whole point is its text.
    const input = { kind: 'readonly', id: 'context', label: 'Context' };

    // Act
    const refused = reportFieldSchema.safeParse(input);
    const accepted = reportFieldSchema.safeParse({ ...input, value: 'route=/' });

    // Assert
    expect(firstIssue(refused)?.path).toBe('value');
    expect(accepted.success).toBe(true);
  });

  it('refuses a select option whose label is empty', () => {
    // Arrange
    const field = { kind: 'select', id: 'severity', label: 'Severity' };

    // Act
    const refused = reportFieldSchema.safeParse({
      ...field,
      options: [{ value: 'blocker', label: '' }],
    });
    const accepted = reportFieldSchema.safeParse({
      ...field,
      options: [{ value: 'blocker', label: 'blocker' }],
    });

    // Assert
    expect(firstIssue(refused)?.path).toBe('options.0.label');
    expect(accepted.success).toBe(true);
  });

  it('refuses a render value that is not a bare language token', () => {
    // Arrange: a value that could close a fence from inside the
    // descriptor is exactly what RENDER_PATTERN is for.
    const field = { kind: 'textarea', id: 'error', label: 'Error message' };

    // Act
    const refused = reportFieldSchema.safeParse({ ...field, render: '```js' });
    const accepted = reportFieldSchema.safeParse({ ...field, render: 'shell' });

    // Assert
    expect(firstIssue(refused)).toEqual({
      path: 'render',
      message: 'A render language is a bare language token.',
    });
    expect(accepted.success).toBe(true);
  });
});

describe('what reportTemplateSchema refuses', () => {
  it('refuses two fields sharing an id and accepts two that differ', () => {
    // Arrange
    const shared = [
      { kind: 'text', id: 'a', label: 'First' },
      { kind: 'textarea', id: 'a', label: 'Second' },
    ];

    // Act
    const refused = reportTemplateSchema.safeParse({
      ...VALID_TEMPLATE,
      fields: shared,
    });
    const accepted = reportTemplateSchema.safeParse({
      ...VALID_TEMPLATE,
      fields: [shared[0], { ...shared[1], id: 'b' }],
    });

    // Assert
    expect(firstIssue(refused)).toEqual({
      path: 'fields',
      message: 'Two fields of one template may not share an id.',
    });
    expect(accepted.success).toBe(true);
  });

  it('refuses a template naming no module', () => {
    // Arrange: `module` is configuration the reader supplies, so an
    // absent one is a reader that has not been wired rather than a
    // template that opted out.
    const withoutModule = Object.fromEntries(
      Object.entries(VALID_TEMPLATE).filter(([key]) => key !== 'module'),
    );

    // Act
    const refused = reportTemplateSchema.safeParse(withoutModule);
    const accepted = reportTemplateSchema.safeParse(VALID_TEMPLATE);

    // Assert
    expect(firstIssue(refused)?.path).toBe('module');
    expect(accepted.success).toBe(true);
  });

  it('refuses a template id that is not an identifier', () => {
    // Act
    const parse = reportTemplateSchema.safeParse({
      ...VALID_TEMPLATE,
      id: '../bug-report',
    });

    // Assert
    expect(firstIssue(parse)).toEqual({
      path: 'id',
      message: 'A template id is an identifier.',
    });
  });

  it('refuses an x-devtools screenshot that is not a boolean', () => {
    // Act
    const refused = reportTemplateSchema.safeParse({
      ...VALID_TEMPLATE,
      devtools: { screenshot: 'yes' },
    });
    const accepted = reportTemplateSchema.safeParse({
      ...VALID_TEMPLATE,
      devtools: { screenshot: false },
    });

    // Assert
    expect(firstIssue(refused)?.path).toBe('devtools.screenshot');
    expect(accepted.success).toBe(true);
  });

  it('refuses a whole list when one member is malformed', () => {
    // Arrange: the node half already skipped what it could not read,
    // so a bad member reaching the browser means the two halves
    // disagree about the shape.
    const list = [VALID_TEMPLATE, { ...VALID_TEMPLATE, id: 'ui feedback' }];

    // Act
    const refused = reportTemplateListSchema.safeParse(list);
    const accepted = reportTemplateListSchema.safeParse([VALID_TEMPLATE]);

    // Assert
    expect(firstIssue(refused)?.path).toBe('1.id');
    expect(accepted.success).toBe(true);
  });
});

describe('what reportFieldSchema accepts', () => {
  it('accepts one field of each of the seven kinds', () => {
    // Arrange
    const entries = Object.entries(ONE_OF_EACH_KIND);

    // Act
    const parsed = entries.map(([kind, field]) => [
      kind,
      reportFieldSchema.safeParse(field),
    ] as const);

    // Assert
    expect(entries).toHaveLength(7);
    for (const [kind, parse] of parsed) {
      expect(parse.success, `${kind} did not parse`).toBe(true);
      expect(parse.success && parse.data.kind).toBe(kind);
    }
  });

  it('defaults required to false and keeps an explicit true', () => {
    // Act
    const defaulted = reportFieldSchema.safeParse(VALID_FIELD);
    const explicit = reportFieldSchema.safeParse({
      ...VALID_FIELD,
      required: true,
    });

    // Assert
    expect(defaulted.success && defaulted.data).toMatchObject({ required: false });
    expect(explicit.success && explicit.data).toMatchObject({ required: true });
  });

  it('keeps a textarea render token and a text placeholder', () => {
    // Act
    const textarea = reportFieldSchema.safeParse({
      kind: 'textarea',
      id: 'error',
      label: 'Error message shown, if any',
      render: 'shell',
    });
    const text = reportFieldSchema.safeParse({
      ...VALID_FIELD,
      placeholder: 'Opening the lexicon editor cleared the node.',
    });

    // Assert
    expect(textarea.success && textarea.data).toMatchObject({ render: 'shell' });
    expect(text.success && text.data).toMatchObject({
      placeholder: 'Opening the lexicon editor cleared the node.',
    });
  });

  it('defaults a checkbox option required to false', () => {
    // Act
    const parse = reportFieldSchema.safeParse({
      kind: 'checkboxes',
      id: 'confirm',
      label: 'Before filing',
      options: [{ value: 'searched', label: 'I searched' }],
    });

    // Assert
    expect(parse.success && parse.data).toMatchObject({
      options: [{ value: 'searched', label: 'I searched', required: false }],
    });
  });
});

describe('the x-devtools defaults', () => {
  it('defaults an absent block to screenshot and selector on', () => {
    // Act
    const parse = reportTemplateSchema.safeParse(VALID_TEMPLATE);

    // Assert: context is in the answer without ever being declared.
    expect(parse.success && parse.data.devtools).toEqual({
      screenshot: true,
      selector: true,
      context: true,
    });
    expect(REPORT_TEMPLATE_DEVTOOLS_DEFAULTS).toEqual({
      screenshot: true,
      selector: true,
      context: true,
    });
  });

  it('keeps a declared switch and defaults the undeclared one', () => {
    // Arrange: `bug-report.yml`'s block, which names the selector and
    // leaves the screenshot to the default; then the mirror of it, so
    // neither default rests on the absent-block case alone.
    const selectorDeclared = { selector: false };
    const screenshotDeclared = { screenshot: false };

    // Act
    const keepsSelector = reportTemplateSchema.safeParse({
      ...VALID_TEMPLATE,
      devtools: selectorDeclared,
    });
    const keepsScreenshot = reportTemplateSchema.safeParse({
      ...VALID_TEMPLATE,
      devtools: screenshotDeclared,
    });

    // Assert
    expect(keepsSelector.success && keepsSelector.data.devtools).toEqual({
      screenshot: true,
      selector: false,
      context: true,
    });
    expect(keepsScreenshot.success && keepsScreenshot.data.devtools).toEqual({
      screenshot: false,
      selector: true,
      context: true,
    });
  });

  it('ignores an x-devtools that tries to opt out of context', () => {
    // Arrange: spec decision 2 — context is always present. The key is
    // ignored rather than refused, so a hand-edited form still loads.
    const declared = { screenshot: false, selector: false, context: false };

    // Act
    const parse = reportTemplateSchema.safeParse({
      ...VALID_TEMPLATE,
      devtools: declared,
    });

    // Assert
    expect(parse.success && parse.data.devtools).toEqual({
      screenshot: false,
      selector: false,
      context: true,
    });
  });

  it('gives each template its own devtools object', () => {
    // Arrange: two parses that both fall back to the default.
    const first = reportTemplateSchema.safeParse(VALID_TEMPLATE);
    const second = reportTemplateSchema.safeParse({
      ...VALID_TEMPLATE,
      id: 'ui-feedback',
    });

    // Act
    const one = first.success
      ? first.data.devtools
      : null;
    const other = second.success
      ? second.data.devtools
      : null;

    // Assert: equal in value, and not the same object — a shared one
    // would let a later mutation reach every template at once.
    expect(one).toEqual(other);
    expect(one).not.toBe(other);
    expect(one).not.toBe(REPORT_TEMPLATE_DEVTOOLS_DEFAULTS);
  });
});

describe('what a parsed template carries', () => {
  it('carries exactly the six documented keys', () => {
    // Act
    const parse = reportTemplateSchema.safeParse(VALID_TEMPLATE);

    // Assert
    expect(parse.success && Object.keys(parse.data).sort()).toEqual(
      [...TEMPLATE_KEYS].sort(),
    );
  });

  it('strips GitHub own title and labels rather than refusing them', () => {
    // Arrange: both keys exist for GitHub's issue chooser and are read
    // by nothing here; the title prefix is applied by the gateway.
    const input = {
      ...VALID_TEMPLATE,
      title: '[fb/manual] ',
      labels: ['type:bug', 'needs-triage'],
    };

    // Act
    const parse = reportTemplateSchema.safeParse(input);

    // Assert
    expect(parse.success).toBe(true);
    expect(parse.success && Object.keys(parse.data).sort()).toEqual(
      [...TEMPLATE_KEYS].sort(),
    );
  });
});
