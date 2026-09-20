/**
 * @packageDocumentation
 * The shape a report form has: seven field kinds, the template that
 * lists them, and the zod schemas both halves of this package validate
 * against.
 *
 * `.rafa/specs/q20b-2-feedback-feature.md` decisions 1, 2 and 9 are the
 * authority. Decision 1 makes GitHub issue forms the source of the
 * form; decision 2 fixes the widget's own three additions — screenshot,
 * element selector, context — and the `x-devtools` key a template opts
 * out through; decision 9 makes the renderer a slot over
 * {@link ReportField} rather than over GitHub's own body grammar.
 *
 * This module is that shape and nothing else. It reads no file, parses
 * no YAML, sends nothing and holds no module state: it exports
 * schemas, the types inferred from them, and one frozen defaults
 * record. `src/vite/templates.ts` is where a `.github/ISSUE_TEMPLATE/
 * *.yml` becomes one of these, and `src/features/feedback/` is where
 * one is drawn.
 *
 * ## Why `src/core/` and not `src/vite/`
 *
 * Both halves need the same descriptor. The node half BUILDS a
 * {@link ReportTemplate} out of a parsed issue form and validates what
 * it built; the browser half FETCHES a list of them over
 * `GET /__devtools/templates` and validates what arrived. One schema
 * validated at both ends is what makes the two agree, and `src/core/`
 * is the only directory the layering rule lets both import:
 * `src/vite/**` may import `src/core/**`, `src/core/**` may import
 * neither `src/vite/**` nor `src/features/**`. Nothing here touches a
 * node builtin, so the browser entry carries it safely.
 *
 * ## The seven kinds, and where each one comes from
 *
 * | Kind | Source |
 * | --- | --- |
 * | `text` | A GitHub `input` body item. |
 * | `textarea` | A GitHub `textarea` body item. |
 * | `select` | A GitHub `dropdown` body item. |
 * | `checkboxes` | A GitHub `checkboxes` body item. |
 * | `readonly` | A GitHub `markdown` body item, and the widget's own always-present context block. |
 * | `file` | The widget's own screenshot field. |
 * | `selector` | The widget's own element-selector field. |
 *
 * Five map from GitHub and three are the widget's own, which is six
 * rows and seven kinds because `readonly` serves both sides: a
 * `markdown` block and the context block are the same thing to a
 * renderer — text that is shown and never edited.
 *
 * GitHub's `dropdown` also carries a `multiple` attribute, and neither
 * shipped form uses it, so {@link reportFieldSchema} has no member for
 * it and the reader will drop it. That is YAGNI rather than an
 * oversight: a form that ever wants it adds a `multiple` key here and
 * a branch in the renderer, and until then a reader meeting the gap
 * should leave it alone.
 *
 * ## What a template deliberately does NOT carry
 *
 * - **The `[fb/<round>] ` title prefix and the `labels`.** Both are
 *   applied server-side by the gateway, where the round is known; a
 *   template's `title` and `labels` keys exist for GitHub's own issue
 *   chooser and are read by nothing here.
 * - **The PNG/JPEG list and the 5 MB attachment cap.** They live in
 *   `src/features/feedback/submitRules.ts`, which is the one place
 *   that refuses an attachment. {@link ReportField}'s `file` member is
 *   therefore the bare descriptor: a limit written in two places
 *   drifts, and the renderer that draws the screenshot control is the
 *   feature's own under both renderers anyway.
 * - **The `title` ≤ 120 and `body` ≤ 5,000 limits.** Those belong to
 *   the endpoint's payload and live in `src/vite/report.ts`. A field's
 *   maximum here bounds the DESCRIPTOR — the label a form draws — not
 *   the report a person writes into it.
 *
 * `module` is the tracker module a report files under, `web` for every
 * report this plan files. It is required rather than defaulted because
 * the value is configuration the reader supplies, not something a
 * `.yml` in `.github/ISSUE_TEMPLATE/` declares.
 *
 * ## `x-devtools`: two switches and one thing that is not a switch
 *
 * {@link REPORT_TEMPLATE_DEVTOOLS_DEFAULTS} is screenshot ON, selector
 * ON, context ALWAYS. A template opts out through the top-level
 * `x-devtools` key GitHub ignores, and `bug-report.yml` uses it to
 * turn the selector off.
 *
 * `context` is in the parsed shape as a `true` the schema produces
 * rather than as a value an input chooses: spec decision 2 says
 * context is always present and cannot be opted out of. An
 * `x-devtools: {context: false}` is therefore IGNORED and not refused
 * — measured: it parses, and the answer carries `context: true`. That
 * is the right outcome for a key GitHub itself ignores, and it keeps a
 * hand-edited form from failing to load over a key that could never
 * have worked.
 *
 * Measured against zod 4.6.5: `.default()` short-circuits an absent
 * `x-devtools` and answers a fresh SHALLOW CLONE of the default rather
 * than the frozen constant itself, so two templates parsed in a row do
 * not share one `devtools` object. A case below pins that, because the
 * opposite would make one template's opt-out reach every other.
 *
 * ## Why a `select` with no option is refused rather than mapped
 *
 * A dropdown with an empty `options` list is a control a person cannot
 * answer, and its field is `required` more often than not — mapping it
 * would produce a form that can be drawn and never submitted. GitHub's
 * own schema requires `options` on both `dropdown` and `checkboxes`,
 * so a file missing one is malformed at the source rather than merely
 * sparse. Refusing it here makes `src/vite/templates.ts` skip the
 * whole file with a warning that names it, which is a loud reading at
 * dev-server start rather than a silent one at submit time.
 *
 * The plan's task text names `select`. `checkboxes` is held to the
 * same rule for the same two reasons, and each carries its own message
 * so a refusal says which kind failed.
 *
 * ## Naming: two names here are not prefixed, on purpose
 *
 * The package's prefix law puts `devtools` / `DEVTOOLS` in front of
 * every name. `ReportField` and `ReportTemplate` are spelled as this
 * plan's spec and task text spell them, and every other export here
 * mirrors those two so the family reads as one. The law is about what
 * the package puts into a SHARED namespace — a global, a storage key,
 * a CSS custom property, an HTTP path — and these are module-local
 * exports reached through an import; `parseReport` in
 * `src/vite/report.ts` is the same reading, written down there first.
 *
 * ## Mutation note - what the colocated cases actually catch
 *
 * A green suite is no evidence a case can fail. Each leg below was
 * measured by breaking this file, running `bun x vitest run
 * src/core/reportTemplate.test.ts` from `packages/dev-tools`, and
 * restoring this file byte-identical (sha256 compared before and
 * after). The baseline is `Tests 24 passed (24)`.
 *
 * - Dropping `.min(OPTIONS_MIN, ...)` from the `select` options array
 *   answers `Tests 1 failed | 23 passed (24)` - `refuses a select
 *   declaring no option and accepts one option`. Its `checkboxes`
 *   sibling survives, which is what the two separate `.min` calls
 *   buy.
 * - Dropping the same call from `checkboxes` answers `1 failed | 23
 *   passed` - `refuses a checkboxes declaring no option, naming that
 *   kind`, alone.
 * - Reading `DEVTOOLS_SELECTOR_DEFAULT` as `false` answers `2 failed
 *   | 22 passed` - `defaults an absent block to screenshot and
 *   selector on` and `keeps a declared switch and defaults the
 *   undeclared one`. Reading `DEVTOOLS_SCREENSHOT_DEFAULT` as `false`
 *   answers the same two, so neither switch rests on one case.
 * - Each default reaches an answer through TWO sites: the inner
 *   `.default()` on the switch, which runs when `x-devtools` is
 *   present and declares the OTHER switch, and {@link
 *   REPORT_TEMPLATE_DEVTOOLS_DEFAULTS}, which the outer `.default()`
 *   short-circuits to when `x-devtools` is absent entirely. Both read
 *   the same constant, so the leg above moves the two together.
 *   Breaking ONE site - writing `.default(false)` inline on either
 *   switch and leaving the constant alone - answers `1 failed | 23
 *   passed`, and the failing case is `keeps a declared switch and
 *   defaults the undeclared one` for either switch, because that case
 *   declares each one in turn and reads the other's inner default.
 *   The constant is what `defaults an absent block to screenshot and
 *   selector on` pins. So the two sites have a case each, and neither
 *   is covered only by the other.
 * - Declaring `context` as an ordinary switch with a `true` default,
 *   instead of forcing it in the transform, answers `1 failed | 23
 *   passed` - `ignores an x-devtools that tries to opt out of
 *   context`.
 * - Dropping the unique-id refinement answers `1 failed | 23 passed` -
 *   `refuses two fields sharing an id and accepts two that differ`.
 * - Removing the `file` member from the union answers `2 failed | 22
 *   passed` - `accepts one field of each of the seven kinds` and
 *   `refuses a kind outside the seven, naming all seven`.
 *
 * One thing no case pins: that a refusal names the FIRST failure
 * rather than an arbitrary one. Every case varies a single thing, so a
 * template wrong in two places could report either and the suite would
 * not notice.
 */

import { z } from 'zod';

/**
 * The longest identifier accepted for a field id, a template id and a
 * tracker module.
 *
 * Generous, because all three are written by code or by a form author
 * rather than by the person filing a report.
 */
const ID_MAX = 64;

/**
 * What an id may be spelled with.
 *
 * An identifier charset, the same one `src/vite/report.ts` holds a
 * feature id to: a field id keys the value record and reaches the
 * report body as a section heading anchor, a template id travels in a
 * URL query and a module reaches the gateway's argv. Refusing prose
 * here costs a form author nothing.
 */
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** The longest label, template name or option text accepted. */
const LABEL_MAX = 200;

/** The longest description or placeholder accepted. */
const DESCRIPTION_MAX = 1_000;

/**
 * The longest `readonly` value accepted.
 *
 * Display text — a `markdown` block, or the collected context shown
 * back to the person — and never the report body, whose own limit
 * lives in `src/vite/report.ts`.
 */
const READONLY_VALUE_MAX = 10_000;

/** The longest `render` language token accepted. */
const RENDER_MAX = 32;

/**
 * What a `render` language token may be spelled with.
 *
 * GitHub's `render: shell` names a syntax-highlighting language, and
 * the value reaches a fenced code block's info string in the report
 * body. A charset rather than free text so nothing can close the fence
 * from inside the descriptor.
 */
const RENDER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9+#._-]*$/;

/** A `select` and a `checkboxes` each declare at least this many. */
const OPTIONS_MIN = 1;

/** ...and at most this many. */
const OPTIONS_MAX = 100;

/** The most fields one template may declare. */
const FIELDS_MAX = 50;

/** Why a `select` with an empty `options` list is refused. */
const SELECT_OPTIONS_REQUIRED
  = 'A select declares at least one option; a select with none is '
  + 'refused rather than mapped.';

/** Why a `checkboxes` with an empty `options` list is refused. */
const CHECKBOXES_OPTIONS_REQUIRED
  = 'A checkboxes field declares at least one option; a checkboxes '
  + 'field with none is refused rather than mapped.';

/** Why two fields of one template may not share an id. */
const FIELD_IDS_UNIQUE
  = 'Two fields of one template may not share an id.';

/** Screenshot is offered unless a template opts out. */
const DEVTOOLS_SCREENSHOT_DEFAULT = true;

/** The element selector is offered unless a template opts out. */
const DEVTOOLS_SELECTOR_DEFAULT = true;

/**
 * An identifier: a field id, a template id or a tracker module.
 *
 * @returns The schema, freshly built, so each caller's refusal message
 * can name what it was validating.
 */
function idSchema(what: string): z.ZodString {
  return z
    .string()
    .min(1)
    .max(ID_MAX)
    .regex(ID_PATTERN, `A ${what} is an identifier.`);
}

/**
 * One choice of a `select`.
 *
 * `value` is what the form submits and `label` is what it draws. A
 * GitHub `dropdown` declares one string per option and the reader
 * uses it for both; they are separate here so a later template can
 * draw prose over a stable value.
 */
export const reportFieldOptionSchema = z.object({
  /** What the answer carries when this option is chosen. */
  value: z
    .string()
    .min(1)
    .max(LABEL_MAX),

  /** What the form draws for it. */
  label: z
    .string()
    .min(1)
    .max(LABEL_MAX),
});

/**
 * One box of a `checkboxes`.
 *
 * A `select` option with GitHub's per-option `required`, which is the
 * one thing a checkbox has and a dropdown choice does not: a
 * `checkboxes` field is a list of independent assertions, and GitHub
 * lets a form demand a particular one.
 */
export const reportCheckboxOptionSchema = reportFieldOptionSchema.extend({
  /** Whether this one box must be ticked. */
  required: z.boolean().default(false),
});

/**
 * What every field but `readonly` carries.
 *
 * Spread into each member rather than held in a base schema, because
 * `z.discriminatedUnion` wants plain object members and a spread keeps
 * every member's shape readable at its own declaration.
 */
const interactiveFieldBase = {
  /** Keys this field's value; unique within a template. */
  id: idSchema('field id'),

  /** What the form draws above the control. */
  label: z
    .string()
    .min(1)
    .max(LABEL_MAX),

  /** The help text under the label, when the template wrote one. */
  description: z
    .string()
    .max(DESCRIPTION_MAX)
    .optional(),

  /** Whether an answer is demanded before the report is submitted. */
  required: z.boolean().default(false),
};

/** A single-line answer; a GitHub `input`. */
const textFieldSchema = z.object({
  ...interactiveFieldBase,
  kind: z.literal('text'),

  /** The greyed example inside the empty control. */
  placeholder: z
    .string()
    .max(DESCRIPTION_MAX)
    .optional(),
});

/** A multi-line answer; a GitHub `textarea`. */
const textareaFieldSchema = z.object({
  ...interactiveFieldBase,
  kind: z.literal('textarea'),

  /** The greyed example inside the empty control. */
  placeholder: z
    .string()
    .max(DESCRIPTION_MAX)
    .optional(),

  /**
   * The language the answer is fenced in, from GitHub's `render`.
   *
   * Absent for ordinary prose. `bug-report.yml`'s error-message field
   * carries `shell`, and the body builder fences that answer rather
   * than letting a stack trace reflow as Markdown.
   */
  render: z
    .string()
    .min(1)
    .max(RENDER_MAX)
    .regex(RENDER_PATTERN, 'A render language is a bare language token.')
    .optional(),
});

/** One choice out of a declared list; a GitHub `dropdown`. */
const selectFieldSchema = z.object({
  ...interactiveFieldBase,
  kind: z.literal('select'),

  /** At least one; see this module's header for why. */
  options: z
    .array(reportFieldOptionSchema)
    .min(OPTIONS_MIN, SELECT_OPTIONS_REQUIRED)
    .max(OPTIONS_MAX),
});

/** Independent boxes; a GitHub `checkboxes`. */
const checkboxesFieldSchema = z.object({
  ...interactiveFieldBase,
  kind: z.literal('checkboxes'),

  /** At least one; see this module's header for why. */
  options: z
    .array(reportCheckboxOptionSchema)
    .min(OPTIONS_MIN, CHECKBOXES_OPTIONS_REQUIRED)
    .max(OPTIONS_MAX),
});

/**
 * The widget's own screenshot field.
 *
 * Never handed to the `renderForm` slot: the screenshot control is the
 * feature's own under both renderers, which is what keeps their
 * behaviour identical. The descriptor exists so the field still has a
 * place in the list, an id and a label.
 */
const fileFieldSchema = z.object({
  ...interactiveFieldBase,
  kind: z.literal('file'),
});

/** The widget's own element-selector field. */
const selectorFieldSchema = z.object({
  ...interactiveFieldBase,
  kind: z.literal('selector'),

  /** The greyed example inside the empty control. */
  placeholder: z
    .string()
    .max(DESCRIPTION_MAX)
    .optional(),
});

/**
 * Text that is shown and never edited.
 *
 * A GitHub `markdown` body item and the widget's always-present
 * context block are the same thing to a renderer, so they share one
 * kind. It carries no `required` — there is nothing to answer — and
 * its `label` is optional, because a `markdown` block has none of its
 * own while the context block is titled.
 */
const readonlyFieldSchema = z.object({
  /** Keys this field; unique within a template. */
  id: idSchema('field id'),

  /** The heading over the text, when there is one. */
  label: z
    .string()
    .min(1)
    .max(LABEL_MAX)
    .optional(),

  /** The help text under the heading, when the template wrote one. */
  description: z
    .string()
    .max(DESCRIPTION_MAX)
    .optional(),

  /** The text itself. */
  value: z
    .string()
    .min(1)
    .max(READONLY_VALUE_MAX),

  kind: z.literal('readonly'),
});

/**
 * One field of a report form, over the seven kinds.
 *
 * Discriminated on `kind` rather than unioned loosely, so a renderer's
 * `switch` narrows to the one member's extra keys and an unknown kind
 * is a refusal naming all seven rather than a silent fall-through.
 */
export const reportFieldSchema = z.discriminatedUnion('kind', [
  textFieldSchema,
  textareaFieldSchema,
  selectFieldSchema,
  checkboxesFieldSchema,
  fileFieldSchema,
  selectorFieldSchema,
  readonlyFieldSchema,
]);

/**
 * Which of the widget's own three fields a template takes.
 *
 * `context` is produced rather than read: an input key of that name is
 * stripped like any other unknown key and the answer always carries
 * `true`. See this module's header.
 */
export const reportTemplateDevtoolsSchema = z
  .object({
    /** Whether the screenshot control is offered. */
    screenshot: z.boolean().default(DEVTOOLS_SCREENSHOT_DEFAULT),

    /** Whether the element-selector field is offered. */
    selector: z.boolean().default(DEVTOOLS_SELECTOR_DEFAULT),
  })
  .transform((declared) => ({
    ...declared,

    /** Always present; spec decision 2. */
    context: true as const,
  }));

/** What a template's `devtools` block resolves to. */
export type ReportTemplateDevtools = z.infer<
  typeof reportTemplateDevtoolsSchema
>;

/**
 * What a template gets when it declares no `x-devtools` at all.
 *
 * Frozen, and cloned by zod on every parse that falls back to it, so a
 * caller cannot reach another template's block through this one.
 */
export const REPORT_TEMPLATE_DEVTOOLS_DEFAULTS: ReportTemplateDevtools
  = Object.freeze({
    screenshot: DEVTOOLS_SCREENSHOT_DEFAULT,
    selector: DEVTOOLS_SELECTOR_DEFAULT,
    context: true as const,
  });

/**
 * One report form: what it is called, and what it asks.
 *
 * Unknown top-level keys are STRIPPED rather than refused, which is
 * zod's default and is kept: a GitHub issue form carries `title` and
 * `labels` for GitHub's own chooser, and refusing them would make the
 * two readers of one file disagree about what the file may say.
 */
export const reportTemplateSchema = z.object({
  /** Stable id; the reader derives it from the filename. */
  id: idSchema('template id'),

  /** What the report-type select draws for it. */
  name: z
    .string()
    .min(1)
    .max(LABEL_MAX),

  /** One line; what this form is for. */
  description: z
    .string()
    .min(1)
    .max(DESCRIPTION_MAX),

  /** The tracker module a report files under, `web` for this plan. */
  module: idSchema('module'),

  /** The form, in the order it is drawn. */
  fields: z
    .array(reportFieldSchema)
    .max(FIELDS_MAX)
    .refine(
      (fields) => new Set(fields.map((field) => field.id)).size
        === fields.length,
      FIELD_IDS_UNIQUE,
    ),

  /** Which of the widget's own three fields this form takes. */
  devtools: reportTemplateDevtoolsSchema
    .default(REPORT_TEMPLATE_DEVTOOLS_DEFAULTS),
});

/**
 * Every template the plugin found, as the browser half receives it.
 *
 * The browser validates the whole answer rather than each member, so
 * one malformed template refuses the list: the node half already
 * skipped what it could not read, and an unreadable member arriving
 * here means the two halves disagree about the shape, which is a
 * refusal rather than a partial form.
 */
export const reportTemplateListSchema = z.array(reportTemplateSchema);

/**
 * One choice of a `select`.
 *
 * Inferred from {@link reportFieldOptionSchema} rather than declared
 * beside it, so the type cannot drift from what enforces it. Every
 * type below is inferred for the same reason.
 */
export type ReportFieldOption = z.infer<typeof reportFieldOptionSchema>;

/** One box of a `checkboxes`. */
export type ReportCheckboxOption = z.infer<
  typeof reportCheckboxOptionSchema
>;

/** One field of a report form. */
export type ReportField = z.infer<typeof reportFieldSchema>;

/** The seven kinds, as a union of string literals. */
export type ReportFieldKind = ReportField['kind'];

/** One report form. */
export type ReportTemplate = z.infer<typeof reportTemplateSchema>;
