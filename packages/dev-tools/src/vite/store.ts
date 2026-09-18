/**
 * Where a validated report lands on disk, and the only module in this
 * package that writes a file.
 *
 * Spec item 8.4 is the authority — "writes `<outDir>/<round>/
 * <timestamp>-<slug>.json` and one file per attachment first (default
 * `outDir` `.rafa/feedback`), then hands the stored report to
 * `gateway.file(report)`". The write is here; the handing on is
 * `./plugin.ts`'s, over the interface `./gateway.ts` declares.
 *
 * ## The filesystem and the clock are arguments
 *
 * {@link storeReport} takes both through {@link DevToolsStoreDeps} and
 * reaches for neither itself: there is no `import ... from
 * 'node:fs/promises'` in this file and no `new Date()`. So a case is an
 * in-memory {@link DevToolsStoreFs} and a fixed {@link DevToolsClock},
 * every path a case asserts on is exact rather than "something ending
 * in `.json`", and the colocated suite writes nothing anywhere — not
 * even into a temp directory. `./plugin.ts` is the one place the real
 * `node:fs/promises` and the real clock are named.
 *
 * ## Why a title cannot escape the round directory
 *
 * A report body is untrusted — `./report.ts`'s header says why — and
 * two of the values that reach a PATH here come out of it: the report's
 * `title`, which becomes the slug, and each attachment's `name`. Both
 * go through {@link sanitiseSegment}, which does not strip the
 * dangerous characters but rather keeps ONLY `[a-z0-9-]`, mapping every
 * run of anything else to a single dash. `/`, `\`, `.` and NUL are not
 * in the kept set, so a separator and a dot-segment cannot survive it,
 * and neither can a character no filesystem would take.
 *
 * That is also why `../..` is a REFUSAL rather than a rewrite: what is
 * left of a pure traversal after sanitisation is the empty string, and
 * an empty segment would make the report the round directory's own
 * `-.json` rather than a file named after anything. Measured, and the
 * colocated case pins both halves: `'../../etc/passwd'` stores as
 * `etc-passwd.json` INSIDE the round directory, and `'../..'` alone
 * answers {@link DevToolsStoreRefusal} with the rule `slug-unusable`.
 *
 * The round takes the same treatment for the same reason, even though
 * it comes from a plugin option or from `git rev-parse --abbrev-ref`
 * rather than from a request: `feature/thing` would otherwise be two
 * directories, and spec item 9 says the round is sanitised to
 * `[a-z0-9-]` regardless of where it came from.
 *
 * An attachment `name` is the one value here allowed a dot, because it
 * carries an extension a viewer needs — see
 * {@link sanitiseAttachmentFileName} for how it gets exactly one.
 *
 * ## Attachments are written BEFORE the report JSON
 *
 * Deliberate, and the reason the writes are sequential rather than a
 * `Promise.all`: the JSON names its attachment files, so a reader that
 * finds the JSON can rely on every file it names existing. A crash
 * midway leaves orphan attachments, which is the harmless direction; a
 * JSON pointing at files that were never written is the harmful one.
 *
 * ## What is NOT written
 *
 * The attachments' base64. Each attachment is decoded once and written
 * as bytes, and the JSON keeps `{name, mime, bytes, file}` instead — so
 * a 5 MB screenshot is on disk once rather than twice, and the JSON
 * stays a thing a person can open. `file` is a BASENAME, not a path, so
 * the directory can be moved or archived whole.
 *
 * ## Mutation note - what the colocated cases actually catch
 *
 * A green suite is not evidence a case can fail. Each leg below was
 * measured by breaking this file, running `bun x vitest run
 * src/vite/store.test.ts` from `packages/dev-tools`, and restoring this
 * file byte-identical (checksum compared before and after every leg;
 * the hash is not quoted here because this header is part of the file
 * it would name). The baseline is `Tests 15 passed (15)`.
 *
 * - Having {@link sanitiseSegment} STRIP what it may not keep rather
 *   than map each run to one dash answers `Tests 7 failed | 8 passed
 *   (15)` - nearly the file, because the slug is in every path a case
 *   asserts on. That breadth is the reason the other legs below are
 *   narrower edits: this one proves little beyond "the sanitiser is
 *   load-bearing".
 * - Dropping the edge-dash trim that runs AFTER the truncation answers
 *   `1 failed | 14 passed` - `truncates a long title to at most 60
 *   characters of slug`. Only the mid-word half falls; the 70-letter
 *   half has no dash to expose, which is why that case carries both.
 * - Writing the report JSON BEFORE the attachments answers `3 failed |
 *   12 passed` - the failed-attachment refusal and the two attachment
 *   cases. The refusal is the one that matters: it is the whole of
 *   this module's claim that a JSON on disk always has its
 *   attachments beside it.
 * - Having {@link sanitiseAttachmentFileName} fall back to a fixed
 *   `'attachment'` instead of answering `null` answers `1 failed | 14
 *   passed` - `refuses an unusable attachment name before writing
 *   anything`.
 * - Widening {@link ERRNO_PATTERN} to `/^.+$/` answers `1 failed | 14
 *   passed` - `appends an errno to a write refusal and nothing else`.
 *   Its control half (a real `EROFS` IS appended) survives the leg, so
 *   the case reads as "this one was filtered" rather than as "nothing
 *   is ever appended".
 * - Dropping the clock check answers `1 failed | 14 passed` - `refuses
 *   a clock that answers no usable time`.
 * - Raising {@link SLUG_MAX} to 61 answers `1 failed | 14 passed` -
 *   the truncation case, through its 70-letter half.
 * - Dropping the ordinal from an attachment filename answers `2 failed
 *   | 13 passed` - both attachment cases, the first of which is the
 *   collision reading: its two attachments sanitise to the same name.
 * - Using `request.round` raw instead of sanitised answers `2 failed |
 *   13 passed` - `refuses a round left empty by sanitisation` and
 *   `sanitises the round and the slug to [a-z0-9-]`.
 * - Giving {@link DevToolsStoreFs.writeFile} a third required
 *   parameter reds `check-types` with `src/vite/store.test.ts(542,11):
 *   error TS2322: Type 'true' is not assignable to type 'false'` -
 *   the type-level case, whose failure mode is a compile error rather
 *   than a red test.
 *
 * Two things no case pins. A `write-failed` refusal may leave a
 * created directory or an already-written attachment behind, and
 * nothing asserts what is left; and NO case in this package writes
 * through the real `node:fs/promises`, so the injected seam's
 * agreement with node's runtime behaviour rests on the type-level
 * assertion alone.
 */

import type { DevToolsReport } from './report';

import { Buffer } from 'node:buffer';
import { join } from 'node:path';

/**
 * Where reports go when `devtoolsPlugin` was given no `outDir`.
 *
 * The repo-root `.gitignore` already covers `.rafa/`, so a stored
 * report is never a file the loop's `git add -A` would commit.
 */
export const DEVTOOLS_DEFAULT_OUT_DIR = '.rafa/feedback';

/** The longest sanitised round a directory is named with. */
const ROUND_MAX = 64;

/**
 * The longest sanitised slug a filename carries.
 *
 * Shorter than `./report.ts`'s 120-character title limit on purpose: a
 * filename is read in a listing, the timestamp in front of it is what
 * makes it unique, and 60 characters is enough to recognise a report
 * by.
 */
const SLUG_MAX = 60;

/** The longest sanitised stem an attachment filename carries. */
const ATTACHMENT_STEM_MAX = 40;

/** The longest sanitised extension an attachment filename carries. */
const ATTACHMENT_EXTENSION_MAX = 16;

/** How many characters a two-digit date field is padded to. */
const DATE_FIELD_WIDTH = 2;

/** How many characters a four-digit year is padded to. */
const YEAR_WIDTH = 4;

/** How many characters the millisecond field is padded to. */
const MILLIS_WIDTH = 3;

/** How JSON is indented on disk: readable, not minified. */
const JSON_INDENT = 2;

/** Everything a sanitised segment may NOT be spelled with. */
const NON_SEGMENT_CHARACTERS = /[^a-z0-9]+/g;

/** Leading and trailing dashes, which a segment never keeps. */
const EDGE_DASHES = /^-+|-+$/g;

/**
 * What an errno code looks like, so nothing else is ever echoed.
 *
 * A `write-failed` refusal appends the failing error's `code`, and an
 * error object reaches this module from an injected filesystem that
 * `./plugin.ts` supplies but that a test — or a future caller — may
 * shape freely. Holding the appended text to this pattern means a
 * refusal carries `EACCES` or nothing at all, never a message, a path
 * or markup.
 */
const ERRNO_PATTERN = /^[A-Z][A-Z0-9_]{0,31}$/;

/** Which rule refused a write. */
export type DevToolsStoreRule =
  | 'round-unusable'
  | 'slug-unusable'
  | 'attachment-name-unusable'
  | 'clock-unusable'
  | 'write-failed';

/** The fixed explanation each rule answers with. */
const REASONS: Readonly<Record<DevToolsStoreRule, string>> = Object.freeze({
  'round-unusable':
    'The round is left empty by sanitisation, so there is no directory '
    + 'to name.',
  'slug-unusable':
    'The report title is left empty by sanitisation, so there is no '
    + 'file to name.',
  'attachment-name-unusable':
    'An attachment name is left empty by sanitisation, so there is no '
    + 'file to name.',
  'clock-unusable':
    'The clock answered no usable time, so there is no timestamp to '
    + 'name the report with.',
  'write-failed':
    'The report directory could not be written.',
});

/**
 * The part of `node:fs/promises` this module uses, and no more.
 *
 * Two methods, both structurally satisfied by the real module — the
 * colocated suite asserts that assignability at the type level, so a
 * signature edited here that `./plugin.ts` could no longer satisfy reds
 * in `check-types` rather than at dev-server start.
 */
export interface DevToolsStoreFs {
  /**
   * Create a directory and every missing parent.
   *
   * @param path - The directory to create.
   * @param options - Always `{recursive: true}`; the shape is pinned so
   * an implementation cannot be handed a flag it does not expect.
   * @returns Whatever the implementation answers, which this module
   * ignores.
   */
  mkdir(path: string, options: { readonly recursive: true }): Promise<unknown>;

  /**
   * Write a whole file, replacing it if it exists.
   *
   * @param path - The file to write.
   * @param data - Text for the report JSON, bytes for an attachment.
   */
  writeFile(path: string, data: string | Uint8Array): Promise<void>;
}

/**
 * Where the timestamp in a filename comes from.
 *
 * A function rather than a `Date`, so one `storeReport` per request
 * reads the time at the moment it writes, and a case can hand over a
 * clock that never moves.
 */
export type DevToolsClock = () => Date;

/** What {@link storeReport} is asked to write. */
export interface DevToolsStoreRequest {
  /** The report, already through `./report.ts`. */
  readonly report: DevToolsReport;

  /**
   * The directory the round directory is created inside.
   *
   * Comes from the plugin option, defaulting to
   * {@link DEVTOOLS_DEFAULT_OUT_DIR}. Operator-supplied and therefore
   * used as given — it is the one path component here that is not
   * sanitised, because sanitising it would mangle the separators that
   * make it a path at all.
   */
  readonly outDir: string;

  /** The round tag, sanitised here before it names a directory. */
  readonly round: string;
}

/** The two things {@link storeReport} refuses to reach for itself. */
export interface DevToolsStoreDeps {
  /** The filesystem to write through. */
  readonly fs: DevToolsStoreFs;

  /** The clock to timestamp with. */
  readonly now: DevToolsClock;
}

/** One attachment as the report JSON records it. */
export interface DevToolsStoredAttachment {
  /** The name the sender gave it. */
  readonly name: string;

  /** The mime the sender gave it. */
  readonly mime: string;

  /** How many bytes it decoded to. */
  readonly bytes: number;

  /** Its filename in the round directory — a basename, not a path. */
  readonly file: string;
}

/**
 * A report that is on disk.
 *
 * What `./gateway.ts`'s `ReportGateway.file` is handed, which is
 * why it carries the parsed report and the paths together: an
 * implementation renders an issue body from the one and links the
 * other.
 */
export interface DevToolsStoredReport {
  /** The report as `./report.ts` parsed it, attachments included. */
  readonly report: DevToolsReport;

  /** The sanitised round, which is the directory's name. */
  readonly round: string;

  /** When it was stored, ISO 8601 in UTC. */
  readonly storedAt: string;

  /** The report JSON's path — spec item 8.4's stored path. */
  readonly path: string;

  /** Each attachment's path, in the order the report listed them. */
  readonly attachmentPaths: readonly string[];
}

/** A report that was written. */
export interface DevToolsStoreWritten {
  /** Always `true`; the discriminant. */
  readonly ok: true;

  /** Where it went, and what went with it. */
  readonly stored: DevToolsStoredReport;
}

/**
 * A report that was not written, and why.
 *
 * Nothing is written when this is answered: every name is resolved
 * before the first `mkdir`, so a refusal that is not `write-failed`
 * touches the filesystem not at all, and `write-failed` is the one that
 * may leave a directory or an attachment behind.
 */
export interface DevToolsStoreRefusal {
  /** Always `false`; the discriminant. */
  readonly ok: false;

  /** Which rule refused. */
  readonly rule: DevToolsStoreRule;

  /**
   * A fixed explanation of {@link rule}, safe to echo.
   *
   * Never carries a report value; `write-failed` may append an errno
   * code held to {@link ERRNO_PATTERN} and nothing else.
   */
  readonly reason: string;
}

/**
 * What {@link storeReport} answers.
 *
 * The same discriminated shape `./origin.ts` and `./report.ts` answer
 * with, because `./plugin.ts` reads all three in a row.
 */
export type DevToolsStoreResult = DevToolsStoreWritten | DevToolsStoreRefusal;

/**
 * Build the refusal for a rule.
 *
 * @param rule - Which rule refused.
 * @param detail - An errno code to append, when there is one.
 * @returns A frozen refusal carrying the rule and its fixed reason.
 */
function refuse(
  rule: DevToolsStoreRule,
  detail: string | null = null,
): DevToolsStoreRefusal {
  const reason = detail === null
    ? REASONS[rule]
    : `${REASONS[rule]} (${detail})`;

  return Object.freeze({ ok: false as const, rule, reason });
}

/**
 * Keep only `[a-z0-9-]`, and never at an edge.
 *
 * Lower-cases first, so `Feature/Thing` and `feature/thing` name the
 * same directory on a case-insensitive filesystem as on a
 * case-sensitive one; then maps every run of anything else to one dash,
 * truncates, and trims the dashes a truncation may have left exposed.
 *
 * Exported for `./git.ts`, which sanitises the round to the same rule
 * one step earlier — spec item 9's `[a-z0-9-]` — so that the round
 * reaching `__DEVTOOLS_ROUND__` and the round naming this module's
 * directory cannot drift apart. The function is idempotent, so a round
 * that came through `./git.ts` passing it again here changes nothing.
 * It is NOT part of the package's public surface: `./index.ts` exports
 * neither it nor anything else from this file.
 *
 * @param value - The raw text.
 * @param maxLength - How long the result may be.
 * @returns The sanitised segment, which is `''` when nothing survived.
 */
export function sanitiseSegment(value: string, maxLength: number): string {
  const kept = value
    .toLowerCase()
    .replace(NON_SEGMENT_CHARACTERS, '-')
    .replace(EDGE_DASHES, '');

  return kept.slice(0, maxLength).replace(EDGE_DASHES, '');
}

/**
 * Sanitise an attachment name into a filename with one extension.
 *
 * The stem and the extension are sanitised SEPARATELY and rejoined
 * with a single dot, which is how a dot survives here without a
 * dot-segment surviving with it: `..` splits into an empty stem, and an
 * empty stem is a refusal. `screenshot.png` keeps its extension,
 * `My Screenshot (2).PNG` becomes `my-screenshot-2.png`, and
 * `../../evil` — whose last dot is inside the traversal — leaves
 * nothing for a stem.
 *
 * @param name - The attachment name the sender gave.
 * @returns The filename, or `null` when nothing usable survived.
 */
function sanitiseAttachmentFileName(name: string): string | null {
  const dot = name.lastIndexOf('.');
  const hasExtension = dot > 0 && dot < name.length - 1;

  const rawStem = hasExtension
    ? name.slice(0, dot)
    : name;

  const stem = sanitiseSegment(rawStem, ATTACHMENT_STEM_MAX);

  if (stem === '') {
    return null;
  }

  const extension = hasExtension
    ? sanitiseSegment(name.slice(dot + 1), ATTACHMENT_EXTENSION_MAX)
    : '';

  if (extension === '') {
    return stem;
  }

  return `${stem}.${extension}`;
}

/**
 * Spell a moment as a sortable, filename-safe stamp.
 *
 * `YYYYMMDD-HHMMSS-mmm` in UTC: digits and dashes only, so it needs no
 * sanitising and carries no colon a Windows filesystem would refuse;
 * lexicographic order is chronological order; and UTC rather than local
 * time so reports written on two machines interleave correctly.
 *
 * @param date - The moment the clock answered.
 * @returns The stamp.
 */
function stampOf(date: Date): string {
  const year = String(date.getUTCFullYear()).padStart(YEAR_WIDTH, '0');
  const month = String(date.getUTCMonth() + 1).padStart(DATE_FIELD_WIDTH, '0');
  const day = String(date.getUTCDate()).padStart(DATE_FIELD_WIDTH, '0');
  const hours = String(date.getUTCHours()).padStart(DATE_FIELD_WIDTH, '0');
  const minutes = String(date.getUTCMinutes()).padStart(DATE_FIELD_WIDTH, '0');
  const seconds = String(date.getUTCSeconds()).padStart(DATE_FIELD_WIDTH, '0');
  const millis = String(date.getUTCMilliseconds()).padStart(MILLIS_WIDTH, '0');

  return `${year}${month}${day}-${hours}${minutes}${seconds}-${millis}`;
}

/**
 * Read an errno code off an unknown thrown value.
 *
 * @param error - Whatever the filesystem rejected with.
 * @returns The code when it is one, `null` otherwise.
 */
function errnoOf(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }

  const { code } = error as { readonly code?: unknown };

  if (typeof code !== 'string' || !ERRNO_PATTERN.test(code)) {
    return null;
  }

  return code;
}

/**
 * The part of an attachment {@link planAttachment} reads.
 *
 * Spelled structurally rather than as `DevToolsReport['attachments']`
 * indexed into, because that type is optional and an element read off
 * it needs a non-null assertion to name.
 */
interface StorableAttachment {
  /** The name the sender gave it. */
  readonly name: string;

  /** The mime the sender gave it. */
  readonly mime: string;

  /** Its bytes, standard padded base64. */
  readonly base64: string;
}

/** An attachment with its filename and its decoded bytes resolved. */
interface PlannedAttachment {
  /** How the report JSON records it. */
  readonly record: DevToolsStoredAttachment;

  /** Where it is written. */
  readonly path: string;

  /** What is written there. */
  readonly bytes: Buffer;
}

/**
 * Resolve one attachment's filename, path and bytes.
 *
 * @param attachment - The attachment as the report carried it.
 * @param ordinal - Its 1-based position, which prefixes the filename so
 * that two attachments whose names sanitise alike cannot collide.
 * @param base - The `<timestamp>-<slug>` the report JSON also uses.
 * @param directory - The round directory.
 * @returns The planned write, or `null` when the name is unusable.
 */
function planAttachment(
  attachment: StorableAttachment,
  ordinal: number,
  base: string,
  directory: string,
): PlannedAttachment | null {
  const fileName = sanitiseAttachmentFileName(attachment.name);

  if (fileName === null) {
    return null;
  }

  const file = `${base}-${ordinal}-${fileName}`;
  const bytes = Buffer.from(attachment.base64, 'base64');

  return Object.freeze({
    record: Object.freeze({
      name: attachment.name,
      mime: attachment.mime,
      bytes: bytes.length,
      file,
    }),
    path: join(directory, file),
    bytes,
  });
}

/**
 * Write a validated report and its attachments.
 *
 * Every name is resolved before anything is written, so a refusal over
 * a round, a slug, an attachment name or the clock leaves the
 * filesystem untouched. Then the directory is created, each attachment
 * is written in the order the report listed them, and the JSON is
 * written last — see this module's header for why that order.
 *
 * @param request - The report, the output directory and the round.
 * @param deps - The filesystem and the clock, both injected.
 * @returns The stored report, carrying spec item 8.4's stored path, or
 * the refusal naming the rule.
 */
export async function storeReport(
  request: DevToolsStoreRequest,
  deps: DevToolsStoreDeps,
): Promise<DevToolsStoreResult> {
  const round = sanitiseSegment(request.round, ROUND_MAX);

  if (round === '') {
    return refuse('round-unusable');
  }

  const slug = sanitiseSegment(request.report.title, SLUG_MAX);

  if (slug === '') {
    return refuse('slug-unusable');
  }

  const at = deps.now();

  if (!Number.isFinite(at.getTime())) {
    return refuse('clock-unusable');
  }

  const base = `${stampOf(at)}-${slug}`;
  const directory = join(request.outDir, round);
  const path = join(directory, `${base}.json`);

  const planned = (request.report.attachments ?? []).map(
    (attachment, index) => planAttachment(
      attachment,
      index + 1,
      base,
      directory,
    ),
  );
  const usable = planned.filter(
    (entry): entry is PlannedAttachment => entry !== null,
  );

  if (usable.length !== planned.length) {
    return refuse('attachment-name-unusable');
  }

  const storedAt = at.toISOString();
  const payload = {
    round,
    storedAt,
    feature: request.report.feature,
    title: request.report.title,
    body: request.report.body,
    context: request.report.context,
    attachments: usable.map((entry) => entry.record),
  };

  try {
    await deps.fs.mkdir(directory, { recursive: true });

    for (const entry of usable) {
      // Sequential, not a Promise.all: the JSON written below names
      // these files, so every one of them exists before it does.
      await deps.fs.writeFile(entry.path, entry.bytes);
    }

    await deps.fs.writeFile(
      path,
      `${JSON.stringify(payload, null, JSON_INDENT)}\n`,
    );
  } catch (error) {
    return refuse('write-failed', errnoOf(error));
  }

  return Object.freeze({
    ok: true as const,
    stored: Object.freeze({
      report: request.report,
      round,
      storedAt,
      path,
      attachmentPaths: Object.freeze(usable.map((entry) => entry.path)),
    }),
  });
}
