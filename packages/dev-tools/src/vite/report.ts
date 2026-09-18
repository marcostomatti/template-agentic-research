/**
 * The body of `POST /__devtools/report`, and the one function that
 * turns an unknown request payload into either a report or a refusal.
 *
 * Spec item 8.3 is the authority — "body validated with zod (`feature`
 * id, `title` ≤ 120, `body` ≤ 5,000, `context` a flat record,
 * `attachments?` as `{name, mime, base64}` ≤ 5 MB each, ≤ 3)". All of
 * it lives here, pure: this module reads the one argument it is handed,
 * touches no filesystem, no clock, no socket and no module state, and
 * answers a value rather than writing a response. `./plugin.ts` is
 * where it is called — after `./origin.ts`'s two checks and before
 * `./store.ts` writes anything — and where a refusal becomes a status
 * code.
 *
 * ## Why a schema at all, when the sender is our own form
 *
 * The form q20b-2 ships is the intended sender, but it is not the only
 * possible one: the endpoint is an unauthenticated HTTP route on a dev
 * server, and `./origin.ts` establishes only that a request came from a
 * page on this origin over loopback, never that the page was ours. What
 * arrives here is therefore untrusted, and every value that leaves here
 * is about to be turned into a PATH and a FILE by `./store.ts`. The
 * limits below are the size of that write, and the {@link
 * ATTACHMENT_NAME_PATTERN} refusal is the reason a `name` cannot name a
 * directory.
 *
 * ## The two limits this module does NOT enforce
 *
 * - The size of the REQUEST. Three 5 MB attachments plus a 5,000
 *   character body is a body worth ~20 MB once base64 is counted, and
 *   nothing here refuses the 21st megabyte — this function is handed an
 *   already-parsed value, so by the time it runs the bytes are in
 *   memory. Capping what the middleware reads off the socket before it
 *   parses is `./plugin.ts`'s job, not this file's.
 * - The total across attachments. "≤ 5 MB each, ≤ 3" is what the spec
 *   says and what this enforces, so 15 MB of attachment is a legal
 *   report. Restated here because "5 MB" reads like a budget and is
 *   not one.
 *
 * ## What a refusal may safely be echoed
 *
 * {@link DevToolsReportRefusal.reason} is zod's own message, which
 * names the EXPECTATION and at most the received TYPE — "Invalid
 * input: expected string, received number" — and never the received
 * VALUE, so a refusal cannot reflect a body's text back to a browser.
 * Measured: every reason the colocated cases assert on was read out of
 * a real parse, and none contains the input that produced it.
 *
 * {@link DevToolsReportRefusal.path} is the exception, and the one
 * thing a caller must treat as data rather than as markup: a refused
 * `context` VALUE carries the offending key as its last segment —
 * `context.route` — and a key is input. (The key refusal below is not
 * this shape; it answers the bare path `context`, measured.)
 * `./plugin.ts` puts the path in a JSON response body, where it is
 * inert; a caller that ever puts it in HTML must escape it.
 *
 * ## "Characters" means CODE POINTS here, not UTF-16 units
 *
 * Measured against zod 4.5.1: `z.string().max(120)` accepts
 * `'😀'.repeat(61)`, which is 61 code points and 122 `.length` units,
 * and refuses `'😀'.repeat(121)`. So zod counts what a reader counts
 * rather than what `String.length` counts, and spec item 8.3's "≤ 120"
 * is enforced in the reader's units. Written down because it is the
 * opposite of the zod 3 behaviour and because the practical effect is
 * that a title of astral characters may be up to 240 UTF-16 units and
 * a body up to 10,000 — which is what `./plugin.ts`'s request cap has
 * to budget for, not the character counts above.
 *
 * ## Mutation note - what the colocated cases actually catch
 *
 * A green suite is not evidence a case can fail. Each leg below was
 * measured by breaking this file, running `bun x vitest run
 * src/vite/report.test.ts` from `packages/dev-tools`, and restoring
 * this file byte-identical (checksum compared before and after). The
 * baseline is `Tests 22 passed (22)`.
 *
 * - Raising {@link TITLE_MAX} to 121 answers `Tests 2 failed | 20
 *   passed (22)` - `refuses a title of 121 characters and accepts one
 *   of 120` and `counts a title in code points, not in UTF-16 units`.
 *   The second falls with it because its over-limit half is 121 code
 *   points, which is the point: that case reads the same boundary in
 *   another unit rather than a boundary of its own.
 * - Raising {@link BODY_MAX} to 5,001 answers `1 failed | 21 passed`
 *   - the body case alone.
 * - Dropping `.max(ATTACHMENTS_MAX)` from the array answers `1 failed
 *   | 21 passed` - `refuses a fourth attachment and accepts three`.
 * - Reading {@link ATTACHMENT_BYTES_MAX} as `5_000_000` answers `1
 *   failed | 21 passed` - the boundary case. Only its ACCEPTING half
 *   falls: 5,242,881 bytes is over either reading, so the refusal
 *   half survives this leg and the control is what carries the
 *   mebibyte reading.
 * - Replacing {@link ATTACHMENT_NAME_PATTERN} with `/^[^/]+$/`, so
 *   only the POSIX separator is refused, answers `2 failed | 20
 *   passed` - `refuses an attachment name containing a path
 *   separator` (the Windows spelling) and `refuses a dotfile name and
 *   the two directory names`.
 * - Neutering the {@link FORBIDDEN_CONTEXT_KEYS} refinement answers
 *   `1 failed | 21 passed` - the prototype-key case. As the set's own
 *   note says, the `__proto__` case is NOT among the failures, which
 *   is the measurement behind that note rather than an omission.
 * - Neutering the base64 well-formedness refinement, leaving the size
 *   one, answers `1 failed | 21 passed` - `refuses an attachment body
 *   that is not standard base64`. The size check cannot stand in for
 *   it: a malformed string measures as `null` bytes and passes.
 * - Widening {@link contextValueSchema} to `z.unknown()` answers `2
 *   failed | 20 passed` - the nested case and the array/null case.
 * - Dropping `.min(1)` from `title` answers `1 failed | 21 passed` -
 *   `refuses an empty feature, title and body`.
 *
 * One thing no case pins: that a refusal names the FIRST failure
 * rather than an arbitrary one. Every case here varies a single
 * field, so a body wrong in two places could report either and the
 * suite would not notice.
 */

import { z } from 'zod';

/**
 * The longest `feature` id accepted.
 *
 * A feature id is an identifier the app registers a feature under, not
 * prose, so this is generous rather than tight.
 */
const FEATURE_ID_MAX = 64;

/**
 * What a `feature` id may be spelled with.
 *
 * An identifier charset — alphanumerics, then dots, dashes and
 * underscores — because the id keys a registered `DevToolsFeature` and
 * reaches a filename through the stored report. Deliberately not the
 * whole of `string` even though `DevToolsFeature.id` is typed that
 * wide: the id is written by the code that registers the feature, so
 * refusing prose here costs a caller nothing and removes a class of
 * value from everything downstream.
 */
const FEATURE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** Spec item 8.3's `title` ≤ 120. */
const TITLE_MAX = 120;

/** Spec item 8.3's `body` ≤ 5,000. */
const BODY_MAX = 5_000;

/** Spec item 8.3's `attachments` ≤ 3. */
const ATTACHMENTS_MAX = 3;

/** The longest attachment `name` accepted, comfortably under every
 * filesystem's own limit. */
const ATTACHMENT_NAME_MAX = 128;

/** The longest attachment `mime` accepted. */
const ATTACHMENT_MIME_MAX = 255;

/**
 * What an attachment `name` may be spelled with.
 *
 * The refusal the plan names explicitly, and the reason it is a
 * pattern rather than a `.includes('/')`: `/` is only the separator
 * this platform uses. `\` is the other one, and a name is allowed
 * neither, nor a NUL, nor a leading dot — which would make a stored
 * attachment invisible to `ls` — nor the `.` and `..` that name a
 * directory without carrying a separator at all.
 *
 * `./store.ts` sanitises what it writes regardless. This is the
 * earlier of the two guards, and it refuses rather than rewrites, so a
 * caller learns its name was unacceptable instead of finding a
 * different file than it sent.
 */
const ATTACHMENT_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 ._-]*$/;

/**
 * What a `mime` may be spelled with: one type, one slash, one subtype.
 *
 * Parameters (`; charset=utf-8`) are refused rather than ignored — an
 * attachment is bytes with a label, and nothing downstream reads a
 * charset.
 */
const MIME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]*\/[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]*$/;

/** Standard base64 — RFC 4648 §4, padded, no URL-safe alphabet. */
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

/** Base64 encodes three bytes per four characters. */
const BASE64_GROUP = 4;

/** ...and this is the three. */
const BASE64_GROUP_BYTES = 3;

/**
 * Spec item 8.3's 5 MB, read as mebibytes.
 *
 * `5 * 1024 * 1024` rather than `5_000_000`, which is the reading that
 * makes a "5 MB" file a browser reports as 5 MB fit. The two differ by
 * about 5%, so the choice is only ever visible at the boundary, and
 * the colocated cases pin THIS number.
 */
const ATTACHMENT_BYTES_MAX = 5 * 1024 * 1024;

/**
 * Keys a `context` may not carry.
 *
 * All three arrive as own properties after `JSON.parse`, so they are
 * ordinary data rather than an inherited member, and they are refused
 * because the report travels onward: anything that later spreads or
 * assigns the record into a fresh object risks walking a prototype,
 * and a context key is one of the few values here an untrusted body
 * chooses freely.
 *
 * ## Only two of the three ever reach this check (measured)
 *
 * zod 4.5.1's record parse DROPS an own `__proto__` from its output
 * before any refinement runs, so a body carrying one parses as a
 * SUCCESS whose `context` simply lacks the key — the refinement below
 * never sees it and cannot refuse it. Measured on
 * `{"context":{"__proto__":{"polluted":"yes"},"keep":"v"}}`: the
 * answer is `ok`, `context` is `{keep: 'v'}`, its prototype is still
 * `Object.prototype`, it has no own `__proto__`, and `({}).polluted`
 * is `undefined`.
 *
 * So the outcome for `__proto__` is safe, and it is safe because of
 * zod rather than because of this set. The key stays listed anyway:
 * it costs nothing, it documents the intent at the one place a reader
 * looks for it, and it is the guard if zod's record output ever stops
 * dropping it. `constructor` and `prototype` DO reach this check and
 * are refused by it — the colocated cases pin both halves of that
 * split, so a future zod that changes either reads as a failure here
 * rather than as a silent pass.
 */
const FORBIDDEN_CONTEXT_KEYS: ReadonlySet<string> = new Set([
  '__proto__',
  'constructor',
  'prototype',
]);

/**
 * How many bytes a base64 string decodes to, without decoding it.
 *
 * Measured from the length rather than from `Buffer.from(...).length`
 * on purpose: this module stays free of node builtins that the layer
 * would allow but that a 5 MB allocation per rejected request would
 * make into a denial-of-service lever. A body may be refused for being
 * too large without ever being materialised.
 *
 * @param value - The candidate base64 text.
 * @returns The decoded byte count, or `null` when the text is not
 * well-formed standard base64.
 */
function decodedBase64Bytes(value: string): number | null {
  if (value.length % BASE64_GROUP !== 0) {
    return null;
  }

  if (!BASE64_PATTERN.test(value)) {
    return null;
  }

  const groups = value.length / BASE64_GROUP;
  const padding = value.length - value.replace(/=+$/, '').length;

  return groups * BASE64_GROUP_BYTES - padding;
}

/**
 * One captured file travelling with a report.
 *
 * `base64` rather than a multipart upload because the sender is a
 * browser feature holding a canvas snapshot or a `File` it already
 * read, and a single JSON body keeps the endpoint to one shape.
 */
const attachmentSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(ATTACHMENT_NAME_MAX)
    .regex(
      ATTACHMENT_NAME_PATTERN,
      'An attachment name is a plain filename: it may not contain a '
      + 'path separator, begin with a dot, or name a directory.',
    ),
  mime: z
    .string()
    .min(1)
    .max(ATTACHMENT_MIME_MAX)
    .regex(MIME_PATTERN, 'A mime is one type and one subtype.'),
  base64: z
    .string()
    .min(1)
    .refine(
      (value) => decodedBase64Bytes(value) !== null,
      'An attachment body is standard padded base64.',
    )
    .refine(
      (value) => (decodedBase64Bytes(value) ?? 0) <= ATTACHMENT_BYTES_MAX,
      `An attachment decodes to at most ${ATTACHMENT_BYTES_MAX} bytes.`,
    ),
});

/**
 * A `context` value: a primitive, and nothing that nests.
 *
 * The same three types `DevToolsConfig.extra()` is typed to answer, so
 * the widget's own context and an app's merge into one flat record.
 * An object, an array and a `null` are all refused rather than
 * flattened — the point of the limit is that a report's context can be
 * read as a table, and a refusal tells the sender its value was
 * dropped where a silent flatten would not.
 */
const contextValueSchema = z.union([z.string(), z.number(), z.boolean()]);

/**
 * The body of `POST /__devtools/report`.
 *
 * Unknown top-level keys are STRIPPED rather than refused, which is
 * zod's default and is kept deliberately: `context` is the sanctioned
 * place for whatever the app wants a report to carry, so a key outside
 * it is a sender that has not been updated rather than an attack, and
 * refusing would couple the plugin's version to the form's. What is
 * stripped never reaches `./store.ts`, so nothing unvalidated is
 * written.
 */
export const devtoolsReportSchema = z.object({
  /** Which registered feature the report came from. */
  feature: z
    .string()
    .min(1)
    .max(FEATURE_ID_MAX)
    .regex(FEATURE_ID_PATTERN, 'A feature id is an identifier.'),

  /** One line; what the report is about. */
  title: z
    .string()
    .min(1)
    .max(TITLE_MAX),

  /** The report itself. */
  body: z
    .string()
    .min(1)
    .max(BODY_MAX),

  /** What the app and the widget knew when the report was written. */
  context: z
    .record(z.string(), contextValueSchema)
    .refine(
      (value) => Object.keys(value).every(
        (key) => !FORBIDDEN_CONTEXT_KEYS.has(key),
      ),
      'A context key may not name a prototype member.',
    ),

  /** Optional captured files, at most three. */
  attachments: z
    .array(attachmentSchema)
    .max(ATTACHMENTS_MAX)
    .optional(),
});

/**
 * A validated report body.
 *
 * Inferred from {@link devtoolsReportSchema} rather than declared
 * beside it, so the type cannot drift from the thing that enforces it.
 */
export type DevToolsReport = z.infer<typeof devtoolsReportSchema>;

/** A body that passed {@link devtoolsReportSchema}. */
export interface DevToolsReportParsed {
  /** Always `true`; the discriminant. */
  readonly ok: true;

  /** The report, with unknown top-level keys stripped. */
  readonly report: DevToolsReport;
}

/**
 * A body that did not pass, and where it failed.
 *
 * One refusal, not a list: the endpoint answers a status code and a
 * sentence, the form shows the first thing wrong, and a caller that
 * wants every issue can reach for {@link devtoolsReportSchema}
 * directly.
 */
export interface DevToolsReportRefusal {
  /** Always `false`; the discriminant. */
  readonly ok: false;

  /**
   * Which field failed, dotted — `title`, `attachments.0.name`,
   * `context.route` — and `''` when the body itself is not an object.
   *
   * May end in an input-supplied `context` key; see this module's
   * header for what that means for a caller that displays it.
   */
  readonly path: string;

  /** Why, in zod's words. Never contains the received value. */
  readonly reason: string;
}

/**
 * What {@link parseReport} answers.
 *
 * A discriminated union rather than a nullable report, so a caller
 * that reads {@link DevToolsReportParsed.report} without testing `ok`
 * first does not compile — the same shape `./origin.ts` answers with,
 * because `./plugin.ts` reads both in a row.
 */
export type DevToolsReportParse = DevToolsReportParsed | DevToolsReportRefusal;

/**
 * The reason a refusal carries when zod gave none.
 *
 * See {@link parseReport} for why that cannot currently happen.
 */
const UNEXPLAINED_REFUSAL = 'The report body was refused.';

/**
 * Join a zod issue path into the dotted form a caller reports.
 *
 * @param segments - The issue's path, whose members are object keys
 * and array indices.
 * @returns The dotted path, or `''` for an issue on the root.
 */
function dottedPath(segments: readonly PropertyKey[]): string {
  return segments.map((segment) => String(segment)).join('.');
}

/**
 * Validate an unknown request body.
 *
 * Named `parseReport` rather than with this package's `devtools`
 * prefix because the plan's task text names it: the prefix law is
 * about what the package puts into a shared namespace — globals,
 * storage keys, CSS custom properties, HTTP paths — and this is a
 * module-local function reached through an import.
 *
 * @param input - Whatever the middleware parsed out of the request
 * body. `unknown` on purpose: `JSON.parse` answers `any`, and taking
 * it as `unknown` makes this the boundary rather than a formality
 * after one.
 * @returns The parsed report, or the first refusal with its field
 * path.
 */
export function parseReport(input: unknown): DevToolsReportParse {
  const result = devtoolsReportSchema.safeParse(input);

  if (result.success) {
    return Object.freeze({ ok: true as const, report: result.data });
  }

  const [issue] = result.error.issues;

  if (issue === undefined) {
    // Unreachable with zod 4.5.1: a `safeParse` that answers
    // `success: false` always carries at least one issue. The branch
    // exists because `noUncheckedIndexedAccess` types the first
    // element as possibly absent and `tsc` refuses the read without
    // it — `error TS18048: 'issue' is possibly 'undefined'`
    // (measured). Written as a refusal rather than a thrown error or
    // a `!` assertion so that a zod which ever did answer an empty
    // issue list would refuse the body instead of crashing the dev
    // server's middleware.
    //
    // No case pins this branch, and none can while it is
    // unreachable; it is the one path in this module the colocated
    // suite does not exercise.
    return Object.freeze({
      ok: false as const,
      path: '',
      reason: UNEXPLAINED_REFUSAL,
    });
  }

  return Object.freeze({
    ok: false as const,
    path: dottedPath(issue.path),
    reason: issue.message,
  });
}
