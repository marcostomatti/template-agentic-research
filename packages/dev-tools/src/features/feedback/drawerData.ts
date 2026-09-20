/**
 * @packageDocumentation
 * The two reads the drawer makes when it opens, and the encoding that
 * turns a captured or dropped image into what the wire accepts.
 *
 * `./submit.ts` owns the two calls that SEND; these are the three that
 * come before one. They are here rather than there for a plain reason:
 * that module is 725 lines against this package's "aim at 400", and
 * three more errands would have pushed it past the 800-line cap.
 *
 * Everything below is asynchronous and everything below reaches
 * outside the drawer — `host.fetch` for the two reads, the platform's
 * own `Blob` and `btoa` for the encoding. The judgements that are
 * plain functions of plain values live in `./drawerModel.ts` and
 * `./drawerOutcome.ts` instead.
 *
 * ## Why the drawer re-reads both on every mount
 *
 * The template list and the repository slug are the dev SERVER's
 * state: an issue form edited while the app is running changes the
 * first, and `src/vite/endpoint.ts` reads the templates directory per
 * request precisely so that it can. Answering from the last read
 * instead would cost an operator a stale form to save one request to a
 * server on the same machine.
 *
 * Both answers are then KEPT in `./drawerDraft.ts`, which is a
 * different thing from caching them: the drawer draws its form at once
 * on the way back from a collapse rather than blank, and a static
 * frame — where no effect runs — can be given templates to draw. The
 * request still goes out.
 *
 * ## Refusals are sentences, and they carry nothing supplied
 *
 * Both reads answer fixed text when they cannot answer data, in
 * `./submitRules.ts`'s discipline: a reason interpolates nothing a
 * page, a person or a server put there. The dev server's own refusal
 * body is deliberately NOT quoted back. `GET <endpoint>/templates`
 * cannot refuse a well-formed request — `src/vite/templates.ts` skips
 * what it cannot read and answers a list either way — so an answer
 * that is not a list means the two halves of this package disagree
 * about the shape, which is a bug to fix and not a sentence to show
 * somebody trying to report one.
 *
 * ## `repo` has no refusal at all
 *
 * {@link loadFeedbackRepo} answers the slug or `null`. There is
 * nothing to tell a person: the slug exists to build one optional
 * link, and `./drawerOutcome.ts`'s `feedbackIssueUrl` already answers
 * `null` for a slug it will not use. A dev server that could not say
 * what repository it is serving simply leaves the drawer with the copy
 * block and no link beside it.
 *
 * ## The attachment name is built here, not read
 *
 * `src/vite/report.ts` accepts `^[A-Za-z0-9][A-Za-z0-9 ._-]*$` and at
 * most 128 characters. A browser filename satisfies none of that by
 * construction, and `captureScreen()` answers a `Blob`, which has no
 * name at all. So {@link encodeFeedbackAttachment} SANITISES what it
 * is given and falls back to a name derived from the mime — which is
 * what `./DropZone.tsx` means when it says the caption name is not the
 * wire name.
 *
 * ## Mutation note — what the colocated cases actually catch
 *
 * A green suite is no evidence a case can fail. Each leg below was
 * measured by breaking this file, running `bun x vitest run
 * src/features/feedback/drawerData.test.ts` from `packages/dev-tools`,
 * and restoring this file byte-identical (SHA-256 compared before and
 * after, every leg). The baseline is `Tests 27 passed (27)`.
 *
 * - Answering {@link UNREADABLE_REASON} where a server could not be
 *   reached, so one sentence covers both, answers `2 failed | 25
 *   passed`: the throwing fetch and the answer that is not JSON. The
 *   two reasons are read separately for exactly this reason.
 * - Never consulting `reportTemplateListSchema` and answering the body
 *   as a list answers `3 failed | 24 passed`: the object where a list
 *   goes, the form the schema refuses, and the defaults case.
 * - Dropping the chunking from {@link encodeBytes} answers `1 failed |
 *   26 passed`: `encodes a blob far larger than one chunk`. That case
 *   is sized off a measurement rather than a guess —
 *   `String.fromCharCode(...bytes)` reds with `RangeError: Maximum
 *   call stack size exceeded` from 1,000,000 arguments under bun and
 *   from 200,000 under node, and both runtimes take 100,000 — so a
 *   case built on 100,000 bytes passed the leg and the one that runs
 *   uses a mebibyte.
 * - Dropping the mime's `toLowerCase` answers `1 failed | 26 passed`.
 *   That case hands in a structural stand-in rather than a `File`,
 *   because the platform lower-cases `type` in both constructors
 *   (measured: `new File([], 'x', {type: 'IMAGE/PNG'}).type` is
 *   `image/png`), so no case built from a real one could red.
 * - Dropping the blank-mime fallback answers `1 failed | 26 passed`:
 *   `reads a blob with no type as the PNG a capture answers`.
 * - Reading {@link NAME_LIMIT} as 1,000 answers `1 failed | 26
 *   passed`; dropping the charset replacement answers `1 failed | 26
 *   passed`; and dropping the leading-character strip answers `2
 *   failed | 25 passed`, taking the sanitise-to-nothing case with it.
 * - **One leg does NOT red, and the absence is the finding.** Letting
 *   {@link loadFeedbackRepo} accept an array leaves all 27 green: an
 *   array carries no `repo`, so the string test below refuses it one
 *   line later. The guard stays because it makes the function honest
 *   about what a status payload is — `./submit.ts` records the same
 *   reading of its own `recordIn` — and because no JSON answer can
 *   reach it any other way.
 *
 * `bun x tsc --noEmit` exits `0` under all nine: every leg is a
 * behaviour change over types that still line up, so `check-types`
 * would never report one and the suite is the only gate that does.
 */

import type { FeedbackReportAttachment } from './submit';
import type { ReportTemplate } from '../../core/reportTemplate';
import type { DevToolsHost } from '../../core/types';

import { reportTemplateListSchema } from '../../core/reportTemplate';

import { FEEDBACK_CAPTURE_MIME } from './capture';

/** The templates route, as a path under {@link DevToolsHost.endpoint}. */
export const FEEDBACK_TEMPLATES_PATH = '/templates';

/** The status route, under the same endpoint. */
export const FEEDBACK_STATUS_PATH = '/status';

/** Shown when the dev server could not be reached at all. */
const UNREACHABLE_REASON
  = 'The dev server did not answer, so there are no report forms to '
  + 'fill in. Is it still running?';

/** Shown when it answered something that is not a template list. */
const UNREADABLE_REASON
  = 'The dev server answered something this widget could not read as '
  + 'a list of report forms.';

/** What the status payload calls the repository slug. */
const REPO_KEY = 'repo';

/** The mime a dropped JPEG reports, for the fallback filename. */
const JPEG_MIME = 'image/jpeg';

/** What a captured or unnamed image is called on the wire. */
const DEFAULT_NAME_STEM = 'screenshot';

/** ...with this extension for a PNG. */
const PNG_EXTENSION = '.png';

/** ...and this one for a JPEG. */
const JPEG_EXTENSION = '.jpg';

/** The longest `name` `src/vite/report.ts` accepts. */
const NAME_LIMIT = 128;

/** Every character that file's charset does not admit. */
const NAME_DISALLOWED = /[^A-Za-z0-9 ._-]/gu;

/** ...and everything before the first character it may START with. */
const NAME_LEADING = /^[^A-Za-z0-9]+/u;

/**
 * How many bytes are turned into characters at a time.
 *
 * `String.fromCharCode(...bytes)` spreads one argument per byte, and
 * a 5 MB attachment — which `./submitRules.ts` accepts — is five
 * million arguments and a certain `RangeError: Maximum call stack
 * size exceeded`. Chunking is what makes the encoding work at the
 * size the rules allow, and the colocated case encodes a blob larger
 * than one chunk for exactly that reason.
 */
const CHUNK_BYTES = 8_192;

/** The templates the dev server served. */
export interface FeedbackTemplatesRead {
  /** The discriminant. */
  readonly ok: true;

  /** Every form it found, in the order it found them; may be empty. */
  readonly templates: readonly ReportTemplate[];
}

/** ...or the sentence to show instead of a form. */
export interface FeedbackTemplatesRefused {
  /** The discriminant. */
  readonly ok: false;

  /** Fixed text; see this module's documentation. */
  readonly reason: string;
}

/** What {@link loadFeedbackTemplates} answers. */
export type FeedbackTemplatesResult
  = FeedbackTemplatesRead | FeedbackTemplatesRefused;

/**
 * Read a JSON body without letting either half throw.
 *
 * @param host - The one surface a feature may reach.
 * @param path - Joined onto the endpoint.
 * @returns What the server said, or `undefined` when it could not be
 * reached or did not answer JSON. `undefined` rather than `null`
 * because `null` is itself a JSON answer.
 */
async function readJson(
  host: DevToolsHost,
  path: string,
): Promise<unknown> {
  try {
    const response = await host.fetch(path);

    return await response.json();
  } catch {
    return undefined;
  }
}

/**
 * Read the report forms the plugin parsed.
 *
 * @param host - The one surface a feature may reach.
 * @returns The list, or the sentence the drawer shows in place of a
 * form. An empty list is a successful read: a repository with no issue
 * forms is a repository the widget has nothing to offer for, which is
 * the drawer's sentence to write and not this one's.
 */
export async function loadFeedbackTemplates(
  host: DevToolsHost,
): Promise<FeedbackTemplatesResult> {
  const body = await readJson(host, FEEDBACK_TEMPLATES_PATH);

  if (body === undefined) {
    return Object.freeze({ ok: false as const, reason: UNREACHABLE_REASON });
  }

  const parsed = reportTemplateListSchema.safeParse(body);

  if (!parsed.success) {
    return Object.freeze({ ok: false as const, reason: UNREADABLE_REASON });
  }

  return Object.freeze({
    ok: true as const,
    templates: Object.freeze(parsed.data),
  });
}

/**
 * Read the `owner/name` slug of the repository being served.
 *
 * @param host - The one surface a feature may reach.
 * @returns The slug as the status payload spelled it, or `null` when
 * the server could not be reached, answered no JSON object, or
 * answered no `repo` string. The value is NOT validated here —
 * `./drawerOutcome.ts` refuses a slug it cannot build a link from, so
 * `unknown` travels this far and is refused there, in one place.
 */
export async function loadFeedbackRepo(
  host: DevToolsHost,
): Promise<string | null> {
  const body = await readJson(host, FEEDBACK_STATUS_PATH);

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return null;
  }

  const repo: unknown = (body as Record<string, unknown>)[REPO_KEY];

  if (typeof repo !== 'string' || repo.trim() === '') {
    return null;
  }

  return repo.trim();
}

/**
 * Name an image for the wire.
 *
 * @param file - What the drawer holds: a `File` the operator dropped
 * or chose, or the `Blob` `./capture.ts` answered.
 * @param mime - The type the attachment travels as.
 * @returns A name `src/vite/report.ts` accepts. The browser's own
 * filename where enough of it survives sanitisation, and
 * `screenshot.png` or `screenshot.jpg` otherwise — a capture has no
 * name, and a name written in a script this charset does not admit
 * can be sanitised down to nothing.
 */
function wireName(file: Blob, mime: string): string {
  const supplied = file instanceof File
    ? file.name
    : '';
  const cleaned = supplied
    .replace(NAME_DISALLOWED, '-')
    .replace(NAME_LEADING, '')
    .slice(0, NAME_LIMIT);

  if (cleaned !== '') {
    return cleaned;
  }

  return mime === JPEG_MIME
    ? `${DEFAULT_NAME_STEM}${JPEG_EXTENSION}`
    : `${DEFAULT_NAME_STEM}${PNG_EXTENSION}`;
}

/**
 * Turn the bytes into standard padded base64.
 *
 * @param bytes - The decoded image.
 * @returns The base64 text `src/vite/report.ts` decodes back.
 */
function encodeBytes(bytes: Uint8Array): string {
  const chunks: string[] = [];

  for (let start = 0; start < bytes.length; start += CHUNK_BYTES) {
    chunks.push(
      String.fromCharCode(...bytes.subarray(start, start + CHUNK_BYTES)),
    );
  }

  return btoa(chunks.join(''));
}

/**
 * Encode one image as `POST <endpoint>/report` carries it.
 *
 * Refuses nothing: `./submitRules.ts`'s `refuseAttachment` has already
 * been asked, by `./DropZone.tsx` when the file arrived and by
 * `refuseSubmit` when the report was submitted, and a second copy of
 * the size and mime rules here would be a third place for them to
 * drift.
 *
 * @param file - What the drawer holds.
 * @returns The frozen `{name, mime, base64}` record. The mime is
 * lower-cased and falls back to PNG, which is what `./capture.ts`
 * answers and the only type a `Blob` reaching here with no `type` can
 * be.
 */
export async function encodeFeedbackAttachment(
  file: Blob,
): Promise<FeedbackReportAttachment> {
  const declared = file.type.trim().toLowerCase();
  const mime = declared === ''
    ? FEEDBACK_CAPTURE_MIME
    : declared;
  const bytes = new Uint8Array(await file.arrayBuffer());

  return Object.freeze({
    name: wireName(file, mime),
    mime,
    base64: encodeBytes(bytes),
  });
}
