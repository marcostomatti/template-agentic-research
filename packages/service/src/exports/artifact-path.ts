/**
 * @packageDocumentation
 * artifact-path — the one rule every artifact path obeys, and the only
 * route from a name somebody else wrote to a filename.
 *
 * A RENDERER NEVER LEARNS AN ABSOLUTE PATH. `ExportArtifact.path` in
 * `./index.ts` is relative to whatever destination the caller resolved
 * for the subscription, and this module is what turns that sentence
 * into a property rather than a convention: {@link buildArtifactPath}
 * composes only destination-relative paths, and
 * {@link checkArtifactPath} refuses every shape that would name a
 * location instead of a file inside one.
 *
 * THE CALLER THAT RESOLVED THE DESTINATION IS THE ONLY THING THAT CAN
 * TURN ONE OF THESE INTO A LOCATION. An artifact is a value and not an
 * effect — `ExportArtifact` argues that at its own declaration — so
 * nothing here opens a file, resolves a directory, or reads a
 * connector row. What comes back is a name and a shape; where it lands
 * is decided after every renderer has returned, by whoever knows the
 * destination. That split is what leaves a finding title unable to
 * name a file outside the destination even though a filename is built
 * out of one.
 *
 * This module sits under `src/exports/` rather than under `src/lib/`,
 * so the splice rule does not reach it and the import below is
 * legitimate. {@link slugify} is the reduction that rule exists to
 * keep in one place: it is the ONLY route by which untrusted text may
 * reach a path, which is stated at the function itself, and building a
 * second reduction here would be a second answer to the same question.
 *
 * ## What is refused, and why the order fixes which reason
 *
 * {@link checkArtifactPath} answers on the first check that refuses,
 * the shape `validateEntityName` in `src/lib/validate-entity-name.ts`
 * sets for the same reason: a reason is a diagnostic for whoever reads
 * the log, so a value failing several checks reports the one that ran
 * first rather than the worst thing about it.
 *
 * 1. NOTHING TO NAME A FILE WITH. An empty path, or an empty segment
 *    inside one — which is what a doubled or a trailing separator
 *    leaves behind.
 * 2. A CONTROL CHARACTER, ON THE RAW VALUE, BEFORE THE PATH IS SPLIT.
 *    This is the most load-bearing line in the file. A NUL truncates a
 *    path at the boundary between this process and the filesystem, so
 *    every check below it would be reading a string the filesystem
 *    never sees; the tail after the NUL is invisible to the segment
 *    checks and present in the value a reviewer reads.
 * 3. A BACKSLASH, also before the split. The split below is on the
 *    forward slash alone, so a traversal spelled with backslashes is
 *    ONE segment to every check after this one and would pass the
 *    traversal check untouched.
 * 4. A DRIVE LETTER. Absolute without a leading separator, which is
 *    exactly why it is a check of its own rather than a case of the
 *    next one.
 * 5. A LEADING SEPARATOR. The path opens at a root, so the
 *    destination the caller resolved is not what it is relative to.
 * 6. A TRAVERSAL SEGMENT, on the split path. A whole segment of two
 *    dots and nothing else, so `..sums` and `q..b` are ordinary names
 *    and stay accepted — the hazard is the segment, never the
 *    characters.
 *
 * ## What the builder adds, and what it does not
 *
 * {@link buildArtifactPath} reduces every NAME it is given through
 * {@link slugify} and refuses when a reduction answers nothing. That
 * refusal is the reachable half of what the slugger already says about
 * itself: the reduction collapses rather than encodes, so a name
 * written in a script with no ASCII letters in it reduces to nothing
 * at all. Composing anyway would answer a path whose filename is bare
 * extension — a hidden file on every POSIX target, and a name no
 * reader could trace back to the digest it holds.
 *
 * The EXTENSION is not reduced, and the asymmetry is the point. It is
 * declared by the renderer as a literal rather than read out of stored
 * text, so it is not the untrusted half and slugging it would only
 * mangle a legitimate one. It is still CHECKED, because the builder
 * ends by putting its own composed path through
 * {@link checkArtifactPath} — which is what makes the builder unable
 * to answer an accepted path the checker would refuse, whatever any
 * one of its arguments carried. `./artifact-path.test.ts` holds that
 * as a case rather than leaving it to this paragraph.
 */

import { slugify } from '../lib/sanitize-md.js';

/**
 * The separator an artifact path is written with, on every target.
 *
 * Forward slash and nothing else: an artifact path is a
 * destination-relative NAME rather than a path on this machine, so it
 * has no business varying with the platform the renderer happened to
 * run on. The caller that resolves the destination is the layer that
 * knows what a separator is there.
 */
const PATH_SEPARATOR = '/';

/**
 * The other separator, which is refused rather than translated.
 *
 * Translating it would be this module deciding that a name carrying a
 * backslash meant a directory, which is a guess about somebody else's
 * intent. Refusing says so instead. See the header for why it is
 * refused BEFORE the path is split.
 */
const PATH_BACKSLASH = '\\';

/** A whole segment of two dots, which is the traversal shape. */
const PARENT_SEGMENT = '..';

/**
 * A volume prefix: one letter and a colon, at the very start.
 *
 * Anchored, because the hazard is a path that is ABSOLUTE without a
 * leading separator. A colon later in a path is a different question
 * this module does not answer.
 */
const DRIVE_LETTER_RE = /^[A-Za-z]:/;

/**
 * Every control character, as a class built at run time.
 *
 * Assembled from code points rather than written as a literal for the
 * reason `src/lib/audit-log.ts` gives for the identical construction:
 * a control character inside a pattern literal is a lint error here,
 * and a source file carrying one as a raw byte is a file `git diff`
 * renders as binary and POSIX grep reports no match in.
 *
 * NOT global, deliberately. A global pattern advances its own
 * `lastIndex` under `test`, so a shared module-level one answers
 * differently on the second call for the same input.
 */
const CONTROL_CHAR_RE = new RegExp(
  '['
  + String.fromCharCode(0x00)
  + '-'
  + String.fromCharCode(0x1f)
  + String.fromCharCode(0x7f)
  + ']',
);

// ---------------------------------------------------------------------------
// What a caller reads back
// ---------------------------------------------------------------------------

/**
 * Every reason an artifact path is refused.
 *
 * Stable tokens rather than sentences, on the shape
 * `ENTITY_NAME_REJECTIONS` sets in
 * `src/lib/validate-entity-name.ts`: a reason is written into a log
 * line and counted, so a spelling that moves breaks every reader that
 * has already stored one.
 *
 * Declared in the order the checks run, which is also the order a
 * value failing several of them reports. See the header.
 *
 * `empty` — nothing left to name a file with: an empty path, an empty
 * segment inside one, or a name the reduction answered nothing for.
 *
 * `control_character` — carries a control character, NUL first among
 * them.
 *
 * `backslash` — carries the other separator.
 *
 * `drive_letter` — opens with a volume prefix, and so is absolute
 * without a leading separator.
 *
 * `leading_separator` — opens at a root rather than at the resolved
 * destination.
 *
 * `traversal_segment` — carries a segment of two dots, which climbs
 * out of the destination.
 */
export const ARTIFACT_PATH_REFUSALS = [
  'empty',
  'control_character',
  'backslash',
  'drive_letter',
  'leading_separator',
  'traversal_segment',
] as const;

/** One member of {@link ARTIFACT_PATH_REFUSALS}. */
export type ArtifactPathRefusal = (typeof ARTIFACT_PATH_REFUSALS)[number];

/** A path that obeys the rule, and may be put in an artifact. */
export interface ArtifactPathAccepted {
  /** Always `true`, which is what a caller narrows on. */
  readonly ok: true;

  /**
   * The path, destination-relative.
   *
   * From {@link buildArtifactPath} this is the composed name rather
   * than anything a caller supplied; from {@link checkArtifactPath} it
   * is the value that was checked, handed back so a caller narrowing
   * on `ok` reads the checked string rather than its own copy.
   */
  readonly path: string;
}

/**
 * A path the rule refuses, and which check refused it.
 *
 * Carries NO path key, which is `EntityNameRejected`'s shape in
 * `src/lib/validate-entity-name.ts` and is kept here for the same
 * reason: a caller that forgot to narrow on `ok` reads `undefined`
 * rather than the unchecked string it was about to write into an
 * artifact.
 */
export interface ArtifactPathRefused {
  /** Always `false`, which is what a caller narrows on. */
  readonly ok: false;

  /** Which check refused it. See {@link ARTIFACT_PATH_REFUSALS}. */
  readonly reason: ArtifactPathRefusal;
}

/** What both entry points here answer. */
export type ArtifactPathResult = ArtifactPathAccepted | ArtifactPathRefused;

/**
 * The names one artifact path is composed from.
 *
 * Every member is a NAME rather than a path: nothing here may carry a
 * separator with any meaning, because each is reduced through
 * {@link slugify}, which collapses one to a hyphen along with
 * everything else outside the slug alphabet.
 */
export interface ArtifactPathRequest {
  /**
   * The directories the file sits under, outermost first, each
   * reduced to a slug.
   *
   * Empty is legitimate and means the file sits at the destination
   * itself. What is NOT legitimate is a member that reduces to
   * nothing, which is refused rather than dropped — dropping it would
   * silently move the file up one level from where the caller said.
   */
  readonly folders: readonly string[];

  /** The filename, without its extension, reduced to a slug. */
  readonly name: string;

  /**
   * The extension, without a leading dot.
   *
   * Declared by the renderer rather than read out of stored text,
   * which is why this one is not reduced. See the header.
   */
  readonly extension: string;
}

// ---------------------------------------------------------------------------
// The rule
// ---------------------------------------------------------------------------

/**
 * A refusal carrying its reason and nothing else.
 *
 * @param reason - Which check refused.
 * @returns The refusal, with no path key on it.
 */
function refuse(reason: ArtifactPathRefusal): ArtifactPathRefused {
  return { ok: false, reason };
}

/**
 * Decide whether a path may be written into an artifact.
 *
 * The six checks in the order the header fixes, answering on the first
 * that refuses. Never throws: a refusal is a value the caller carries,
 * exactly as a rejected entity name is, so a hostile title cannot turn
 * one render into a failed run.
 *
 * What it answers is about the SHAPE of the path and nothing else. It
 * does not ask whether the name is plausible, whether a file is
 * already there, or whether the destination exists — the first is not
 * this layer's question and the other two are questions only something
 * holding the destination can ask.
 *
 * @param path - The destination-relative path to check.
 * @returns The path, or the reason it was refused.
 */
export function checkArtifactPath(path: string): ArtifactPathResult {
  if (path === '') {
    return refuse('empty');
  }

  // On the raw value, before anything is split: a NUL truncates the
  // path where it leaves this process, so every check below would be
  // reading a string the filesystem never sees.
  if (CONTROL_CHAR_RE.test(path)) {
    return refuse('control_character');
  }

  // Also before the split, which is on the forward slash alone: a
  // traversal spelt with backslashes is one segment to every check
  // after this.
  if (path.includes(PATH_BACKSLASH)) {
    return refuse('backslash');
  }

  if (DRIVE_LETTER_RE.test(path)) {
    return refuse('drive_letter');
  }

  if (path.startsWith(PATH_SEPARATOR)) {
    return refuse('leading_separator');
  }

  const segments = path.split(PATH_SEPARATOR);

  // A doubled or a trailing separator, which names no file.
  if (segments.some((segment) => segment === '')) {
    return refuse('empty');
  }

  // The whole segment, so a name merely CARRYING two dots survives.
  if (segments.some((segment) => segment === PARENT_SEGMENT)) {
    return refuse('traversal_segment');
  }

  return { ok: true, path };
}

/**
 * Compose one destination-relative artifact path.
 *
 * Every name is reduced through {@link slugify} — the only route from
 * untrusted text to a path there is — and the composed result is then
 * put through {@link checkArtifactPath} before it is answered. So an
 * accepted path from here is one the rule accepts, whatever any
 * argument carried, and a caller needs no second check of its own.
 *
 * The reduction is lossy, as the slugger says at length: two names can
 * reduce to one slug. Uniqueness is the caller's to supply, and the
 * usual supplier is a stored id, which is why a renderer names a
 * briefing by its row rather than by its heading.
 *
 * @param request - The names to compose from.
 * @returns The composed path, or the reason it was refused.
 */
export function buildArtifactPath(
  request: ArtifactPathRequest,
): ArtifactPathResult {
  const folders = request.folders.map((folder) => slugify(folder));
  const stem = slugify(request.name);
  const extension = request.extension.trim();

  // A name whose whole content reduces to nothing, which is a real
  // input rather than a malformed one — see the header.
  if (stem === '' || extension === '') {
    return refuse('empty');
  }

  if (folders.some((folder) => folder === '')) {
    return refuse('empty');
  }

  const filename = stem + '.' + extension;

  return checkArtifactPath([...folders, filename].join(PATH_SEPARATOR));
}
