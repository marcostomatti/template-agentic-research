/**
 * The reader that turns a directory of GitHub issue forms into the
 * report templates both halves of this package agree on.
 *
 * `.rafa/specs/q20b-2-feedback-feature.md` decision 1 is the
 * authority: the feedback form is driven by the issue forms in
 * `.github/ISSUE_TEMPLATE/`, so one file describes both the issue a
 * person files by hand on GitHub and the form the widget draws.
 * Decision 2 is why a template carries a `devtools` block — the
 * widget appends screenshot, element selector and context of its own,
 * and a form opts the first two out through the top-level
 * `x-devtools` key GitHub ignores.
 *
 * This is the NODE half: it lists a directory, reads files, parses
 * YAML and maps GitHub's `body` grammar onto
 * `../core/reportTemplate.ts`'s seven field kinds. It decides nothing
 * about the SHAPE — every candidate goes through
 * `reportTemplateSchema`, the same schema the browser half validates
 * the fetched list against.
 *
 * ## The filesystem is an argument
 *
 * {@link loadReportTemplates} takes {@link DevToolsTemplatesFs} and
 * reaches for no real filesystem itself: there is no `node:fs` import
 * here, only `node:path` for joining and splitting names. So most
 * cases hand over an in-memory directory, and the "missing directory"
 * reading is a `readdir` that rejects rather than a path somebody has
 * to arrange. `./plugin.ts` names the real `node:fs/promises`, the
 * seam `./store.ts` already uses for writing.
 *
 * ## Nothing here is fatal
 *
 * A dev server must start with a broken issue form in the tree, so
 * every failure is a SKIP with a warning naming the file, and the
 * answer is the templates that did load:
 *
 * | What is wrong | What is skipped |
 * | --- | --- |
 * | The directory cannot be listed | Everything; the answer is `[]` |
 * | A file is unreadable, too large, or no YAML | That file |
 * | A file is no usable issue form (a `select` with no option) | That file |
 * | A body item declares an unmapped type | That ITEM |
 *
 * The last row is deliberately narrower. GitHub adds body types over
 * time, and a form using a new one is still mostly readable; refusing
 * the whole file would take a working form away over one field the
 * widget cannot draw. Everything else is file-grained, because a file
 * wrong about its shape cannot be partially trusted.
 *
 * {@link DevToolsTemplatesDeps.warn} is REQUIRED where
 * `./endpoint.ts`'s `log?` is optional, because every branch above
 * drops something a form author wrote. A caller wanting silence
 * passes `() => {}` and says so at the call site.
 *
 * ## The five body types, and what each becomes
 *
 * | GitHub `type` | {@link ReportTemplate} field kind |
 * | --- | --- |
 * | `markdown` | `readonly`, carrying `attributes.value` |
 * | `input` | `text` |
 * | `textarea` | `textarea`, carrying `attributes.render` |
 * | `dropdown` | `select` |
 * | `checkboxes` | `checkboxes` |
 *
 * The widget's own `file`, `selector` and context block are NOT
 * produced here. No issue form can declare them: the feature appends
 * them from the `devtools` block, so a form cannot smuggle a second
 * screenshot control in through a body item.
 *
 * `id` comes from the body item when it declares one and from
 * `<type>-<position>` when it does not, which is what makes a
 * `markdown` block — GitHub gives those no id — keyable. Two items
 * that end up sharing an id are a refusal in the core schema, so the
 * file is skipped and the warning names it.
 *
 * ## What an option may be spelled as
 *
 * GitHub's `dropdown` declares options as a list of STRINGS, and a
 * string becomes both the `value` and the `label`. Anything else in
 * that list — a number from an unquoted `320`, a mapping, a nested
 * list — passes through UNMAPPED, so the core schema refuses it and
 * the file is skipped with a warning naming it. That is why
 * `ui-feedback.yml` quotes its breakpoints: a bare `320` is a number
 * to any YAML parser, and a loud skip at dev-server start beats a
 * value stringified somewhere later.
 *
 * `checkboxes` differs, because GitHub declares its options as
 * mappings: `{label, required?}`. The label becomes both `value` and
 * `label`, and `required` rides along per box.
 *
 * ## The id of a template is its filename
 *
 * `bug-report.yml` is the template `bug-report`, because a template id
 * travels in a URL query and has to survive an edit to the file's
 * `name`. A filename that is no identifier — the core schema's
 * charset — makes the file skipped with a warning rather than
 * silently renamed. `config.yml` is skipped by name before any of
 * that: it is GitHub's chooser configuration, never an issue form,
 * and warning about it every dev-server start would be noise.
 *
 * `module` is supplied rather than read: a `.yml` says nothing about
 * which tracker module a report files under, so {@link
 * DevToolsTemplatesRequest.module} carries it and every template of
 * one read gets the same one.
 *
 * ## Mutation note - what the colocated cases actually catch
 *
 * A green suite is no evidence a case can fail. Each leg below was
 * measured by breaking this file, running `bun x vitest run
 * src/vite/templates.test.ts` from `packages/dev-tools`, and restoring
 * it byte-identical (sha256 compared after every leg). The baseline is
 * `Tests 16 passed (16)`, and every `1 failed` below is `1 failed | 15
 * passed (16)`.
 *
 * - {@link readDirectory} rethrowing instead of answering `[]`: `1
 *   failed` - `answers an empty list for a directory that cannot be
 *   listed`.
 * - An unknown body type answering a candidate instead of `null`, so
 *   the whole file is refused: `1 failed` - `skips a body item of an
 *   unknown type rather than the file`.
 * - A `dropdown`'s options passed straight through, without turning
 *   each string into `{value, label}`: `4 failed | 12 passed` - the
 *   select refusal, the one-of-each mapping and BOTH shipped-form
 *   cases, since every shipped dropdown then refuses its file. The
 *   widest leg here, which is why the narrow ones locate a break.
 * - A `checkboxes`' options passed straight through: `1 failed` -
 *   `maps every GitHub body type onto its field kind`.
 * - `devtools` dropped from the candidate, so `x-devtools` is never
 *   read: `1 failed` - `takes the x-devtools block each shipped form
 *   declares`. `defaults an absent x-devtools to screenshot and
 *   selector on` SURVIVES it, rightly: a key never read defaults like
 *   an absent one, so that case pins the core schema's fallback and
 *   the shipped case pins this module's read.
 * - {@link TEXT_MAX} raised to ten million: `1 failed` - `skips a file
 *   too long to be an issue form, naming it`. Measured TWICE: before
 *   that case asserted its warning says `longer than`, the leg PASSED,
 *   because an over-long file parsed anyway is refused a step later
 *   and warns with the same filename. A false negative, closed by
 *   asserting the message and not only the name.
 * - The `<type>-<position>` fallback id dropped: `1 failed` - `maps
 *   every GitHub body type onto its field kind`, whose `markdown`
 *   block is the item with no id of its own.
 * - The `config` basename check skipped, so the chooser configuration
 *   is read as a form: `1 failed` - `ignores the chooser configuration
 *   and any non-form entry silently`.
 * - The `.sort()` dropped from the listing: `1 failed` - `reads a
 *   directory in sorted order and configured paths as given`.
 * - A malformed file skipped without warning: `1 failed` - `skips a
 *   file that is not valid YAML, naming it in a warning`.
 * - An unreadable file skipped without warning: `1 failed` - `skips a
 *   configured path that cannot be read, naming it`.
 * - {@link DevToolsTemplatesRequest.paths} ignored in favour of always
 *   listing the directory: `3 failed | 13 passed` - `skips a
 *   configured path that cannot be read, naming it`, `answers no
 *   template for an explicitly empty path list` and `reads a directory
 *   in sorted order and configured paths as given`.
 *
 * Two things no case pins. A warning's wording is asserted by a
 * fragment only, so a rewording travels rather than reds. And the two
 * shipped-form cases read the repository's OWN
 * `.github/ISSUE_TEMPLATE/`, so they are the only cases here a change
 * outside this package can red.
 */

import type { ReportTemplate } from '../core/reportTemplate';

import { extname, join, parse as parsePath } from 'node:path';

import { parse as parseYaml } from 'yaml';

import { reportTemplateSchema } from '../core/reportTemplate';

/** Where GitHub keeps issue forms, and this reader's default. */
export const DEVTOOLS_ISSUE_FORM_DIR = '.github/ISSUE_TEMPLATE';

/**
 * The basename GitHub reserves for its chooser configuration.
 *
 * Compared case-insensitively against the name without its extension,
 * so `config.yml` and `config.yaml` are both skipped silently.
 */
const ISSUE_FORM_CONFIG_NAME = 'config';

/** The extensions a directory entry must carry to be read. */
const ISSUE_FORM_EXTENSIONS: readonly string[] = Object.freeze([
  '.yml',
  '.yaml',
]);

/**
 * The longest file this reader parses.
 *
 * An issue form is a hand-written descriptor of a few dozen lines, so
 * anything this size is something else sitting in the directory and
 * parsing it would be unbounded work at start. `./git.ts`'s
 * `STDOUT_MAX` is the same habit.
 */
const TEXT_MAX = 100_000;

/** The longest echoed fragment of a parser error or a body type. */
const DETAIL_MAX = 200;

/**
 * What a parsed YAML document is, to the extent this cares.
 *
 * Everything below reads named keys off a record and hands what it
 * finds to zod, so no value from a file is trusted to have a type. A
 * record is read key by key and never spread wholesale, so a key a
 * form author invents cannot reach the candidate.
 */
type YamlRecord = Readonly<Record<string, unknown>>;

/** An empty record, for a body item that carries no `attributes`. */
const NO_ATTRIBUTES: YamlRecord = Object.freeze({});

/**
 * The part of `node:fs/promises` this module uses, and no more.
 *
 * Two methods, both structurally satisfied by the real module — the
 * colocated suite asserts that assignability at the type level, so a
 * signature edited here that `./plugin.ts` could no longer satisfy
 * reds in `check-types` rather than at dev-server start. The same
 * shape `./store.ts`'s `DevToolsStoreFs` has for the write side.
 */
export interface DevToolsTemplatesFs {
  /**
   * List a directory's entries.
   *
   * @param path - The directory to list.
   * @returns The entry names, without their directory. Rejects when
   * the directory is absent, which is how `[]` is reached.
   */
  readdir(path: string): Promise<readonly string[]>;

  /**
   * Read a whole file as text.
   *
   * @param path - The file to read.
   * @param encoding - Always `utf8`, pinned so an implementation
   * cannot be handed an encoding it does not expect.
   * @returns The file's text. Rejects when it cannot be read.
   */
  readFile(path: string, encoding: 'utf8'): Promise<string>;
}

/**
 * Where a skipped file or item is reported.
 *
 * Named `warn` rather than `log`, because every message it receives is
 * something dropped. `./plugin.ts` routes it to Vite's logger, the
 * same sink `./endpoint.ts`'s refusals reach.
 */
export type DevToolsTemplatesWarn = (message: string) => void;

/** The two things {@link loadReportTemplates} will not reach for. */
export interface DevToolsTemplatesDeps {
  /** The filesystem to read through. */
  readonly fs: DevToolsTemplatesFs;

  /** Where a skip is reported; required, see this module's header. */
  readonly warn: DevToolsTemplatesWarn;
}

/** What {@link loadReportTemplates} is asked to read. */
export interface DevToolsTemplatesRequest {
  /**
   * The directory to list, defaulting to
   * {@link DEVTOOLS_ISSUE_FORM_DIR}, and ignored entirely when
   * {@link DevToolsTemplatesRequest.paths} is given.
   */
  readonly dir?: string;

  /**
   * The files to read, instead of listing a directory.
   *
   * Taken as given, in order: no extension filter, no `config` skip
   * and no sort, because a caller that names files has chosen them.
   * An explicitly EMPTY list means no template rather than a fallback
   * to the directory, so a configuration can turn the form off
   * without moving a file.
   */
  readonly paths?: readonly string[];

  /** The tracker module every template of this read files under. */
  readonly module: string;
}

/**
 * Is this value a record a key can be read off.
 *
 * @param value - Anything a parser answered.
 * @returns Whether it is a non-null, non-array object.
 */
function isRecord(value: unknown): value is YamlRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Shorten something echoed into a warning.
 *
 * @param detail - A parser message, or a declared body type.
 * @returns At most {@link DETAIL_MAX} characters of it, on one line,
 * so a dev-server log cannot be reshaped by the file it read.
 */
function brief(detail: string): string {
  return detail
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, DETAIL_MAX);
}

/**
 * Describe a value for a warning.
 *
 * @param value - A `type` a body item declared, of any type.
 * @returns A bounded, single-line rendering of it.
 */
function describe(value: unknown): string {
  return typeof value === 'string'
    ? brief(value)
    : brief(String(value));
}

/**
 * Should a directory entry be read at all.
 *
 * @param entry - One name from `readdir`.
 * @returns Whether it carries an issue-form extension and is not
 * GitHub's chooser configuration.
 */
function isIssueForm(entry: string): boolean {
  if (!ISSUE_FORM_EXTENSIONS.includes(extname(entry).toLowerCase())) {
    return false;
  }

  return parsePath(entry).name.toLowerCase() !== ISSUE_FORM_CONFIG_NAME;
}

/**
 * List the directory, or answer nothing and say so.
 *
 * @param dir - The directory to list.
 * @param deps - The filesystem and the warning sink.
 * @returns The issue-form paths, sorted by name so the list is the
 * same on every machine, or `[]` for a directory that would not list.
 */
async function readDirectory(
  dir: string,
  deps: DevToolsTemplatesDeps,
): Promise<readonly string[]> {
  try {
    const entries = await deps.fs.readdir(dir);

    return entries
      .filter(isIssueForm)
      .sort()
      .map((entry) => join(dir, entry));
  } catch {
    deps.warn(
      `devtools: ${dir} could not be listed, so no report template was `
      + 'loaded.',
    );

    return [];
  }
}

/**
 * Which files this read covers.
 *
 * @param request - The directory or the configured paths.
 * @param deps - The filesystem and the warning sink.
 * @returns The paths to read, in the order they are read.
 */
async function resolvePaths(
  request: DevToolsTemplatesRequest,
  deps: DevToolsTemplatesDeps,
): Promise<readonly string[]> {
  if (request.paths !== undefined) {
    return request.paths;
  }

  return readDirectory(request.dir ?? DEVTOOLS_ISSUE_FORM_DIR, deps);
}

/**
 * Read one file, or answer `null` rather than rejecting.
 *
 * Holds the `try` to the read alone, so the warnings below are emitted
 * outside it and a warning sink that throws cannot be reported as an
 * unreadable file.
 *
 * @param path - The file to read.
 * @param fs - The injected filesystem.
 * @returns The text, or `null` when the read rejected.
 */
async function readOrNull(
  path: string,
  fs: DevToolsTemplatesFs,
): Promise<string | null> {
  try {
    return await fs.readFile(path, 'utf8');
  } catch {
    return null;
  }
}

/**
 * Read one file's text, warning about whatever makes it unusable.
 *
 * @param path - The file to read.
 * @param deps - The filesystem and the warning sink.
 * @returns The text, or `null` for a file that could not be read or is
 * longer than {@link TEXT_MAX} — both warned about, naming the file.
 */
async function readText(
  path: string,
  deps: DevToolsTemplatesDeps,
): Promise<string | null> {
  const text = await readOrNull(path, deps.fs);

  if (text === null) {
    deps.warn(`devtools: ${path} could not be read, so it is skipped.`);

    return null;
  }

  if (text.length > TEXT_MAX) {
    deps.warn(
      `devtools: ${path} is longer than ${TEXT_MAX} characters, so it is `
      + 'skipped rather than parsed as an issue form.',
    );

    return null;
  }

  return text;
}

/** What {@link parseDocument} answered. */
type ParseOutcome =
  | {
    /** Always `true`; the discriminant. */
    readonly ok: true;

    /** Whatever the file held, untrusted. */
    readonly document: unknown;
  }
  | {
    /** Always `false`; the discriminant. */
    readonly ok: false;

    /** A bounded fragment of what the parser objected to. */
    readonly reason: string;
  };

/**
 * Parse one file's text as YAML.
 *
 * @param text - The file's contents.
 * @returns The document, or the parser's objection. Nothing is thrown:
 * a malformed file is a value here and a skip at the call site.
 */
function parseDocument(text: string): ParseOutcome {
  try {
    return { ok: true, document: parseYaml(text) as unknown };
  } catch (cause) {
    return {
      ok: false,
      reason: cause instanceof Error
        ? brief(cause.message)
        : describe(cause),
    };
  }
}

/**
 * The id a body item's field is keyed by.
 *
 * @param item - The body item.
 * @param index - Its position in `body`, zero-based.
 * @param type - Its GitHub type, one of the five.
 * @returns The declared id, or `<type>-<position>` for an item with
 * none — every `markdown` block, which GitHub gives no id.
 */
function fieldId(item: YamlRecord, index: number, type: string): unknown {
  return item.id === undefined
    ? `${type}-${index + 1}`
    : item.id;
}

/**
 * Map a `dropdown`'s options.
 *
 * @param options - Whatever `attributes.options` held.
 * @returns One `{value, label}` per string; anything else passes
 * through for the schema to refuse.
 */
function mapSelectOptions(options: unknown): unknown {
  if (!Array.isArray(options)) {
    return options;
  }

  return (options as readonly unknown[]).map((option) => (
    typeof option === 'string'
      ? { value: option, label: option }
      : option
  ));
}

/**
 * Map a `checkboxes`' options.
 *
 * @param options - Whatever `attributes.options` held.
 * @returns One `{value, label, required}` per declared box, anything
 * else passed through for the schema to refuse.
 */
function mapCheckboxOptions(options: unknown): unknown {
  if (!Array.isArray(options)) {
    return options;
  }

  return (options as readonly unknown[]).map((option) => {
    if (!isRecord(option)) {
      return option;
    }

    return {
      value: option.label,
      label: option.label,
      required: option.required,
    };
  });
}

/**
 * Map one GitHub body item onto a field candidate.
 *
 * A candidate, not a validated field: every value is whatever the
 * file held, and `reportTemplateSchema` decides whether the template
 * is usable.
 *
 * @param item - One entry of `body`, untrusted.
 * @param index - Its position, for the fallback id.
 * @param path - The file, for the warning.
 * @param warn - Where an unknown type is reported.
 * @returns The candidate, or `null` for an item whose type this reader
 * does not map — skipped, never fatal.
 */
function mapBodyItem(
  item: unknown,
  index: number,
  path: string,
  warn: DevToolsTemplatesWarn,
): Record<string, unknown> | null {
  const source = isRecord(item)
    ? item
    : NO_ATTRIBUTES;
  const type = source.type;
  const attributes = isRecord(source.attributes)
    ? source.attributes
    : NO_ATTRIBUTES;
  const validations = isRecord(source.validations)
    ? source.validations
    : NO_ATTRIBUTES;
  const base = {
    id: typeof type === 'string'
      ? fieldId(source, index, type)
      : source.id,
    label: attributes.label,
    description: attributes.description,
    required: validations.required,
  };

  switch (type) {
    case 'markdown':
      return {
        id: base.id,
        label: attributes.label,
        description: attributes.description,
        value: attributes.value,
        kind: 'readonly',
      };
    case 'input':
      return { ...base, kind: 'text', placeholder: attributes.placeholder };
    case 'textarea':
      return {
        ...base,
        kind: 'textarea',
        placeholder: attributes.placeholder,
        render: attributes.render,
      };
    case 'dropdown':
      return {
        ...base,
        kind: 'select',
        options: mapSelectOptions(attributes.options),
      };
    case 'checkboxes':
      return {
        ...base,
        kind: 'checkboxes',
        options: mapCheckboxOptions(attributes.options),
      };
    default:
      warn(
        `devtools: ${path} declares a body item of type ${describe(type)}, `
        + 'which this reader does not map, so that item is skipped.',
      );

      return null;
  }
}

/**
 * Map a whole `body` list onto field candidates.
 *
 * @param body - Whatever the document's `body` key held.
 * @param path - The file, for a warning.
 * @param warn - Where a skipped item is reported.
 * @returns The candidates, or `body` unchanged when it is no list —
 * which the schema refuses, so a file with no `body` is skipped
 * rather than read as a form with no field.
 */
function mapBody(
  body: unknown,
  path: string,
  warn: DevToolsTemplatesWarn,
): unknown {
  if (!Array.isArray(body)) {
    return body;
  }

  const items = body as readonly unknown[];
  const fields: Record<string, unknown>[] = [];

  for (const [index, item] of items.entries()) {
    const field = mapBodyItem(item, index, path, warn);

    if (field !== null) {
      fields.push(field);
    }
  }

  return fields;
}

/**
 * Build the candidate one file's document becomes.
 *
 * @param document - The parsed YAML, untrusted.
 * @param path - The file, for the id and for a warning.
 * @param module - The tracker module the caller supplied.
 * @param warn - Where a skipped body item is reported.
 * @returns A candidate for `reportTemplateSchema`. Only the five keys
 * below are read, so `title` and `labels` — GitHub's own, and the
 * gateway's business rather than this reader's — never travel.
 */
function templateCandidate(
  document: unknown,
  path: string,
  module: string,
  warn: DevToolsTemplatesWarn,
): Record<string, unknown> {
  const source = isRecord(document)
    ? document
    : NO_ATTRIBUTES;

  return {
    id: parsePath(path).name,
    name: source.name,
    description: source.description,
    module,
    fields: mapBody(source.body, path, warn),
    devtools: source['x-devtools'],
  };
}

/**
 * Name what a failed validation objected to first.
 *
 * @param issues - What zod answered.
 * @returns The first issue as `<path>: <message>`, or the message
 * alone for an issue at the root.
 */
function firstIssue(
  issues: readonly { readonly path: readonly PropertyKey[];
    readonly message: string; }[],
): string {
  const issue = issues[0];

  if (issue === undefined) {
    return 'it does not match the report template schema';
  }

  const where = issue.path.map((step) => String(step)).join('.');

  return where === ''
    ? brief(issue.message)
    : `${where}: ${brief(issue.message)}`;
}

/**
 * Read, parse and validate one issue form.
 *
 * @param path - The file to read.
 * @param module - The tracker module the caller supplied.
 * @param deps - The filesystem and the warning sink.
 * @returns The template, or `null` for a file that was skipped — with
 * a warning naming it, whichever step refused.
 */
async function readTemplate(
  path: string,
  module: string,
  deps: DevToolsTemplatesDeps,
): Promise<ReportTemplate | null> {
  const text = await readText(path, deps);

  if (text === null) {
    return null;
  }

  const parsed = parseDocument(text);

  if (!parsed.ok) {
    deps.warn(
      `devtools: ${path} is not valid YAML, so it is skipped `
      + `(${parsed.reason}).`,
    );

    return null;
  }

  const candidate = templateCandidate(
    parsed.document,
    path,
    module,
    deps.warn,
  );
  const validated = reportTemplateSchema.safeParse(candidate);

  if (!validated.success) {
    deps.warn(
      `devtools: ${path} is no usable issue form, so it is skipped `
      + `(${firstIssue(validated.error.issues)}).`,
    );

    return null;
  }

  return validated.data;
}

/**
 * Read every issue form the request covers.
 *
 * Reads the files one after another rather than at once: a handful of
 * small files at dev-server start buy nothing from concurrency, and
 * sequential reads keep the warnings in the same order as the
 * templates, which is what makes a log readable.
 *
 * Nothing here throws. A missing directory, an unreadable file, a
 * malformed one and an unknown body type are all warnings, and the
 * answer is whatever loaded.
 *
 * @param request - The directory or the paths, and the module.
 * @param deps - The filesystem and the warning sink.
 * @returns The templates that loaded, frozen, in the order they were
 * read.
 */
export async function loadReportTemplates(
  request: DevToolsTemplatesRequest,
  deps: DevToolsTemplatesDeps,
): Promise<readonly ReportTemplate[]> {
  const paths = await resolvePaths(request, deps);
  const templates: ReportTemplate[] = [];

  for (const path of paths) {
    const template = await readTemplate(path, request.module, deps);

    if (template !== null) {
      templates.push(template);
    }
  }

  return Object.freeze(templates);
}
