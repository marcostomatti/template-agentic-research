import type {
  DevToolsTemplatesDeps,
  DevToolsTemplatesFs,
} from './templates';
import type { ReportTemplate } from '../core/reportTemplate';
import type * as nodeFs from 'node:fs/promises';

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { REPORT_TEMPLATE_DEVTOOLS_DEFAULTS } from '../core/reportTemplate';

import { DEVTOOLS_ISSUE_FORM_DIR, loadReportTemplates } from './templates';

/**
 * ## Nothing here writes, and almost nothing here reads a real file
 *
 * `templates.ts` takes its filesystem as an argument, so every case
 * below but the shipped-form ones hands it an in-memory directory: no
 * temp directory is created, nothing is cleaned up, and the "missing
 * directory" reading is a `readdir` that rejects rather than a path
 * somebody has to arrange.
 *
 * The two shipped-form cases are the exception ON PURPOSE. They hand
 * over the REAL `node:fs/promises` and the repository's own
 * `.github/ISSUE_TEMPLATE/`, because that is the one thing an
 * in-memory fixture cannot say: that the files this repository
 * actually ships parse, map and validate. A fixture copied from them
 * would agree with itself forever while the shipped forms drifted. It
 * is also the runtime half of the seam reading whose type-level half
 * is the last case in this file.
 *
 * Those two cases assert that the two known ids are AMONG the loaded
 * templates rather than that they are all of them, so a third issue
 * form added later is not a failure here — and they assert the mapped
 * fields of each, so a form edited into something the reader drops
 * IS one.
 *
 * ## Why so many refusals carry a control
 *
 * Every refusal below is "the answer does not contain this", and a
 * reader hard-wired to answer nothing would pass all of them. So each
 * carries the ONE edit that should make it load — a sibling file that
 * is well-formed, the same dropdown with one option, the same
 * directory present — asserted to load in the same case. Several also
 * assert the WARNING, because "skipped loudly" and "dropped silently"
 * are indistinguishable from the answer alone.
 *
 * Refusals run before accepting cases, which is this plan's order for
 * every test file in the package.
 */

/** The directory the in-memory filesystem answers for. */
const DIR = DEVTOOLS_ISSUE_FORM_DIR;

/** The tracker module every case reads under. */
const MODULE = 'web';

/** An issue form that passes every rule; each case varies one thing. */
const VALID_FORM = `name: Bug report
description: Something in the app behaves wrong.
body:
  - type: input
    id: what-happened
    attributes:
      label: What happened
    validations:
      required: true
`;

/** A file that is no YAML document at all. */
const BROKEN_YAML = `name: Bug report
description: "unterminated
body: [
`;

/** Well-formed YAML that is no issue form: it declares no name. */
const NOT_A_FORM = `description: Something in the app behaves wrong.
body:
  - type: input
    id: what-happened
    attributes:
      label: What happened
`;

/** A form whose second body item declares a type this reader drops. */
const UNKNOWN_BODY_TYPE = `name: Bug report
description: Something in the app behaves wrong.
body:
  - type: input
    id: what-happened
    attributes:
      label: What happened
  - type: rating
    id: how-bad
    attributes:
      label: How bad
  - type: textarea
    id: anything-else
    attributes:
      label: Anything else
`;

/**
 * Build a form carrying one dropdown with the given options block.
 *
 * @param options - The YAML under `attributes.options`, indented to
 * sit there.
 * @returns The file's text.
 */
function formWithDropdown(options: string): string {
  return `name: Bug report
description: Something in the app behaves wrong.
body:
  - type: dropdown
    id: severity
    attributes:
      label: Severity
      options:${options}
    validations:
      required: true
`;
}

/** A dropdown declaring no option at all. */
const SELECT_WITH_NO_OPTIONS = formWithDropdown(' []');

/** The same dropdown, declaring one. */
const SELECT_WITH_ONE_OPTION = formWithDropdown('\n        - blocker');

/** One form carrying one body item of each mapped GitHub type. */
const ONE_OF_EACH_TYPE = `name: Bug report
description: Something in the app behaves wrong.
body:
  - type: markdown
    attributes:
      value: Thanks for taking the time to file this.
  - type: input
    id: what-happened
    attributes:
      label: What happened
      description: In one line.
      placeholder: The menu drifts off screen.
    validations:
      required: true
  - type: textarea
    id: error-message
    attributes:
      label: Error message
      render: shell
  - type: dropdown
    id: severity
    attributes:
      label: Severity
      options:
        - blocker
        - minor
    validations:
      required: true
  - type: checkboxes
    id: confirmations
    attributes:
      label: Before filing
      options:
        - label: I searched for an existing report
          required: true
        - label: I can reproduce it on a fresh load
`;

/** What an in-memory world answers with, and what it recorded. */
interface World {
  /** What {@link loadReportTemplates} is handed. */
  readonly deps: DevToolsTemplatesDeps;

  /** Every warning the reader emitted, in order. */
  readonly warnings: readonly string[];
}

/**
 * Build an in-memory directory and a warning recorder.
 *
 * The recorder is the one mutable thing in this file. A spy has to
 * accumulate, and a fresh one is built per case, so the mutation is
 * local to the case that reads it.
 *
 * @param files - Bare filenames under {@link DIR} to their text, or
 * `null` for a directory that does not exist — which is how the
 * missing-directory reading is spelled, with no temp path involved.
 * @returns The deps to pass, and the warning log to read.
 */
function world(files: Readonly<Record<string, string>> | null): World {
  const warnings: string[] = [];
  const fs: DevToolsTemplatesFs = {
    readdir: (path: string): Promise<readonly string[]> => (
      files === null || path !== DIR
        ? Promise.reject(new Error(`ENOENT: ${path}`))
        : Promise.resolve(Object.keys(files))
    ),
    readFile: (path: string): Promise<string> => {
      const text = files?.[path.slice(DIR.length + 1)];

      return text === undefined
        ? Promise.reject(new Error(`ENOENT: ${path}`))
        : Promise.resolve(text);
    },
  };

  return {
    warnings,
    deps: {
      fs,
      warn: (message: string): void => {
        warnings.push(message);
      },
    },
  };
}

/**
 * Read the in-memory directory every case but three shares.
 *
 * @param deps - The world the case built.
 * @returns What the reader answered.
 */
async function loadFrom(
  deps: DevToolsTemplatesDeps,
): Promise<readonly ReportTemplate[]> {
  return loadReportTemplates({ dir: DIR, module: MODULE }, deps);
}

/**
 * Every loaded template's id, in the order they were answered.
 *
 * @param templates - What the reader answered.
 * @returns The ids.
 */
function idsOf(templates: readonly ReportTemplate[]): readonly string[] {
  return templates.map((template) => template.id);
}

/**
 * The one template with this id, or a failing assertion.
 *
 * @param templates - What the reader answered.
 * @param id - Which one is wanted.
 * @returns That template.
 */
function templateNamed(
  templates: readonly ReportTemplate[],
  id: string,
): ReportTemplate {
  const found = templates.find((template) => template.id === id);

  expect(found, `no template with id ${id}`).toBeDefined();

  return found as ReportTemplate;
}

/** The repository root, four directories above this file. */
const REPO_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));

/** The repository's own issue forms, read by the two shipped cases. */
const SHIPPED_DIR = join(REPO_ROOT, DEVTOOLS_ISSUE_FORM_DIR);

/**
 * Load the repository's own issue forms through the real filesystem.
 *
 * @returns What the reader made of them, and every warning it emitted
 * — which the callers assert is empty, because a shipped form the
 * reader has to skip is a broken form.
 */
async function loadShipped(): Promise<{
  readonly templates: readonly ReportTemplate[];
  readonly warnings: readonly string[];
}> {
  const warnings: string[] = [];
  const templates = await loadReportTemplates(
    { dir: SHIPPED_DIR, module: MODULE },
    {
      fs: { readdir, readFile },
      warn: (message: string): void => {
        warnings.push(message);
      },
    },
  );

  return { templates, warnings };
}

describe('loadReportTemplates', () => {
  it(
    'skips a file that is not valid YAML, naming it in a warning',
    async () => {
      // Arrange: one broken file beside one that is well-formed, so
      // the case reads as "that file was skipped" and not as "nothing
      // was loaded".
      const { deps, warnings } = world({
        'broken.yml': BROKEN_YAML,
        'bug-report.yml': VALID_FORM,
      });

      // Act
      const templates = await loadFrom(deps);

      // Assert
      expect(idsOf(templates)).toEqual(['bug-report']);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain(join(DIR, 'broken.yml'));
      expect(warnings[0]).toContain('not valid YAML');
    },
  );

  it(
    'skips well-formed YAML that is no issue form, naming it',
    async () => {
      // Arrange
      const { deps, warnings } = world({
        'nameless.yml': NOT_A_FORM,
        'bug-report.yml': VALID_FORM,
      });

      // Act
      const templates = await loadFrom(deps);

      // Assert
      expect(idsOf(templates)).toEqual(['bug-report']);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain(join(DIR, 'nameless.yml'));
      expect(warnings[0]).toContain('no usable issue form');
    },
  );

  it(
    'skips a body item of an unknown type rather than the file',
    async () => {
      // Arrange
      const { deps, warnings } = world({
        'bug-report.yml': UNKNOWN_BODY_TYPE,
      });

      // Act
      const templates = await loadFrom(deps);

      // Assert: the file still loads, and the two items around the
      // unknown one are still mapped — the control that keeps this
      // from passing over an empty answer.
      expect(templates).toHaveLength(1);
      expect(templateNamed(templates, 'bug-report').fields
        .map((field) => field.id))
        .toEqual(['what-happened', 'anything-else']);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain(join(DIR, 'bug-report.yml'));
      expect(warnings[0]).toContain('rating');
    },
  );

  it(
    'refuses a select declaring no option and accepts one option',
    async () => {
      // Arrange: the same file twice, varying only the options list.
      const refused = world({ 'bug-report.yml': SELECT_WITH_NO_OPTIONS });
      const accepted = world({ 'bug-report.yml': SELECT_WITH_ONE_OPTION });

      // Act
      const skipped = await loadFrom(refused.deps);
      const loaded = await loadFrom(accepted.deps);

      // Assert
      expect(skipped).toEqual([]);
      expect(refused.warnings).toHaveLength(1);
      expect(refused.warnings[0]).toContain(join(DIR, 'bug-report.yml'));
      expect(refused.warnings[0]).toContain('at least one option');
      expect(idsOf(loaded)).toEqual(['bug-report']);
      expect(accepted.warnings).toEqual([]);
    },
  );

  it(
    'answers an empty list for a directory that cannot be listed',
    async () => {
      // Arrange: the same call over a missing directory and over one
      // holding a single form.
      const missing = world(null);
      const present = world({ 'bug-report.yml': VALID_FORM });

      // Act
      const nothing = await loadFrom(missing.deps);
      const something = await loadFrom(present.deps);

      // Assert
      expect(nothing).toEqual([]);
      expect(missing.warnings).toHaveLength(1);
      expect(missing.warnings[0]).toContain(DIR);
      expect(idsOf(something)).toEqual(['bug-report']);
    },
  );

  it(
    'skips a configured path that cannot be read, naming it',
    async () => {
      // Arrange
      const { deps, warnings } = world({ 'bug-report.yml': VALID_FORM });
      const absent = join(DIR, 'gone.yml');

      // Act
      const templates = await loadReportTemplates(
        { paths: [absent, join(DIR, 'bug-report.yml')], module: MODULE },
        deps,
      );

      // Assert
      expect(idsOf(templates)).toEqual(['bug-report']);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain(absent);
      expect(warnings[0]).toContain('could not be read');
    },
  );

  it('skips a file too long to be an issue form, naming it', async () => {
    // Arrange: a file past the reader's cap, beside a real form.
    const { deps, warnings } = world({
      'huge.yml': `# ${'x'.repeat(100_001)}`,
      'bug-report.yml': VALID_FORM,
    });

    // Act
    const templates = await loadFrom(deps);

    // Assert
    expect(idsOf(templates)).toEqual(['bug-report']);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain(join(DIR, 'huge.yml'));
    expect(warnings[0]).toContain('longer than');
  });

  it(
    'refuses a filename that is no identifier and accepts one that is',
    async () => {
      // Arrange: the template id comes from the filename, so the
      // filename has to survive the core schema's charset.
      const { deps, warnings } = world({
        '_draft.yml': VALID_FORM,
        'bug-report.yml': VALID_FORM,
      });

      // Act
      const templates = await loadFrom(deps);

      // Assert
      expect(idsOf(templates)).toEqual(['bug-report']);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain(join(DIR, '_draft.yml'));
    },
  );

  it(
    'ignores the chooser configuration and any non-form entry silently',
    async () => {
      // Arrange: `config.yml` is GitHub's own and is no issue form,
      // and a README is not one either. Neither is a fault, so
      // neither may warn.
      const { deps, warnings } = world({
        'config.yml': 'blank_issues_enabled: false\n',
        'README.md': '# Issue templates\n',
        'bug-report.yml': VALID_FORM,
      });

      // Act
      const templates = await loadFrom(deps);

      // Assert
      expect(idsOf(templates)).toEqual(['bug-report']);
      expect(warnings).toEqual([]);
    },
  );

  it('answers no template for an explicitly empty path list', async () => {
    // Arrange: a directory that would answer one form, and a caller
    // that named no file.
    const { deps, warnings } = world({ 'bug-report.yml': VALID_FORM });

    // Act
    const templates = await loadReportTemplates(
      { dir: DIR, paths: [], module: MODULE },
      deps,
    );

    // Assert: the empty list wins over the directory rather than
    // falling back to it.
    expect(templates).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it(
    'reads a directory in sorted order and configured paths as given',
    async () => {
      // Arrange
      const listed = world({
        'second.yml': VALID_FORM,
        'first.yml': VALID_FORM,
      });
      const named = world({
        'second.yml': VALID_FORM,
        'first.yml': VALID_FORM,
      });

      // Act
      const sorted = await loadFrom(listed.deps);
      const asGiven = await loadReportTemplates(
        {
          paths: [join(DIR, 'second.yml'), join(DIR, 'first.yml')],
          module: MODULE,
        },
        named.deps,
      );

      // Assert
      expect(idsOf(sorted)).toEqual(['first', 'second']);
      expect(idsOf(asGiven)).toEqual(['second', 'first']);
    },
  );

  it('maps every GitHub body type onto its field kind', async () => {
    // Arrange
    const { deps, warnings } = world({ 'bug-report.yml': ONE_OF_EACH_TYPE });

    // Act
    const templates = await loadFrom(deps);

    // Assert
    const { fields } = templateNamed(templates, 'bug-report');

    expect(warnings).toEqual([]);
    expect(fields.map((field) => field.kind))
      .toEqual(['readonly', 'text', 'textarea', 'select', 'checkboxes']);
    expect(fields[0]).toEqual({
      // A markdown block carries no id of its own, so the reader
      // keys it by type and position.
      id: 'markdown-1',
      value: 'Thanks for taking the time to file this.',
      kind: 'readonly',
    });
    expect(fields[1]).toEqual({
      id: 'what-happened',
      kind: 'text',
      label: 'What happened',
      description: 'In one line.',
      placeholder: 'The menu drifts off screen.',
      required: true,
    });
    expect(fields[2]).toEqual({
      id: 'error-message',
      kind: 'textarea',
      label: 'Error message',
      render: 'shell',
      required: false,
    });
    expect(fields[3]).toEqual({
      id: 'severity',
      kind: 'select',
      label: 'Severity',
      required: true,
      options: [
        { value: 'blocker', label: 'blocker' },
        { value: 'minor', label: 'minor' },
      ],
    });
    expect(fields[4]).toEqual({
      id: 'confirmations',
      kind: 'checkboxes',
      label: 'Before filing',
      required: false,
      options: [
        {
          value: 'I searched for an existing report',
          label: 'I searched for an existing report',
          required: true,
        },
        {
          value: 'I can reproduce it on a fresh load',
          label: 'I can reproduce it on a fresh load',
          required: false,
        },
      ],
    });
  });

  it(
    'defaults an absent x-devtools to screenshot and selector on',
    async () => {
      // Arrange: a form declaring no x-devtools at all.
      const { deps } = world({ 'bug-report.yml': VALID_FORM });

      // Act
      const templates = await loadFrom(deps);

      // Assert: context is produced rather than read, so it is on
      // even though nothing in the file mentions it.
      expect(templateNamed(templates, 'bug-report').devtools)
        .toEqual(REPORT_TEMPLATE_DEVTOOLS_DEFAULTS);
      expect(templateNamed(templates, 'bug-report').devtools.context)
        .toBe(true);
    },
  );

  it(
    'loads the repository\'s own two issue forms through the real fs',
    async () => {
      // Arrange + Act: the shipped files, read by node itself.
      const { templates, warnings } = await loadShipped();

      // Assert
      expect(warnings).toEqual([]);
      expect(idsOf(templates)).toContain('bug-report');
      expect(idsOf(templates)).toContain('ui-feedback');

      const bug = templateNamed(templates, 'bug-report');
      const ui = templateNamed(templates, 'ui-feedback');

      expect(bug.name).toBe('Bug report');
      expect(bug.module).toBe(MODULE);
      expect(bug.fields.map((field) => field.id)).toEqual([
        'what-happened',
        'steps-to-reproduce',
        'expected-behaviour',
        'error-message',
        'severity',
      ]);
      expect(bug.fields.map((field) => field.kind)).toEqual([
        'textarea',
        'textarea',
        'textarea',
        'textarea',
        'select',
      ]);
      expect(ui.name).toBe('UI feedback');
      expect(ui.fields.map((field) => field.id))
        .toEqual(['what-looks-wrong', 'surface', 'breakpoint']);
      expect(ui.fields.map((field) => field.kind))
        .toEqual(['textarea', 'select', 'select']);
    },
  );

  it(
    'takes the x-devtools block each shipped form declares',
    async () => {
      // Arrange + Act
      const { templates } = await loadShipped();

      // Assert: the bug form opts the selector out and the UI form
      // takes both, and neither can opt out of context.
      expect(templateNamed(templates, 'bug-report').devtools).toEqual({
        screenshot: true,
        selector: false,
        context: true,
      });
      expect(templateNamed(templates, 'ui-feedback').devtools).toEqual({
        screenshot: true,
        selector: true,
        context: true,
      });
    },
  );

  it('is satisfied by the real node:fs/promises', () => {
    // Arrange: the type-level half of the seam reading. The two
    // shipped-form cases above pass the real module at RUNTIME; this
    // reds in check-types when the interface drifts away from node's
    // own signatures, rather than at dev-server start.
    type NodeFsSatisfiesTemplatesFs =
      Pick<typeof nodeFs, 'readdir' | 'readFile'> extends DevToolsTemplatesFs
        ? true
        : false;

    // Act
    const satisfied: NodeFsSatisfiesTemplatesFs = true;

    // Assert
    expect(satisfied).toBe(true);
  });
});
