/**
 * @packageDocumentation
 * markdown-body — the one composition both markdown renderers share.
 *
 * THE COMPOSER DECIDES LAYOUT AND NEVER CONTENT. Every word that
 * comes back was already stored: the prose is `briefings.body` as a
 * model wrote it, the sections and their counts are
 * `briefings.payload` as `assembleDigest` in
 * `src/lib/digest-assemble.ts` answered them, and a finding's fields
 * are the domain's own payload. What this module supplies is where
 * each of those goes, at what depth, and in what order. It writes no
 * sentence about a digest, invents no heading, re-orders nothing the
 * assembly fixed, and reaches no clock — two calls over one input
 * answer the same bytes.
 *
 * The split is what lets `./obsidian-md.ts` and `./notion-md.ts`
 * differ in front matter and heading depth and in nothing else. Both
 * hand the same input here and place what comes back under their own
 * preamble, so the two files carry the same text under different
 * covers rather than two compositions that can drift apart.
 *
 * ## The stored structure is what is rendered
 *
 * The sections come out of `briefings.payload` and are never
 * re-derived from {@link ExportRenderInput.findings}. `./index.ts`
 * argues that at the input: the structured half is computed once, by
 * the pass that stored it, precisely so four formats cannot disagree
 * about what a period came to. It is also not derivable here even if
 * it were wanted — `ExportFindingRow` carries no category key at all,
 * so nothing in this module could file a row under a section.
 *
 * A payload nothing can read sections out of therefore composes to
 * the prose alone. That is the honest answer rather than a thin one:
 * a briefing written by hand, or backfilled from whatever a domain
 * kept before it had a pipeline, has prose and no assembly, and
 * assembling one here would be writing a second digest at the last
 * step before a person reads it.
 *
 * ## A null count renders as an absence rather than as a zero
 *
 * `DigestSection.count` is `0` when a section was read and held
 * nothing, and `null` when nothing was read for it. A heading carries
 * its count in parentheses, so `0` renders as `(0)` and `null`
 * renders as no parentheses at all. The section is present either
 * way; what changes is whether the document claims a reading was
 * taken.
 *
 * The same shape twice more, on the two other numbers a body shows. A
 * finding's score follows the heading exactly — `(score 0)` for a
 * measured zero, nothing for an unscored row, which is the
 * distinction `ExportFindingRow.score` argues at its own column. And
 * a field whose stored value is null or absent is left out rather
 * than printed as a blank, because a key with nothing after it reads
 * as a field somebody measured and found empty.
 *
 * ## Every untrusted string is reduced on the way in
 *
 * {@link sanitizeUntrusted} runs over the prose, every heading, every
 * field key, every field value and every banner entry. Nothing
 * reaches the composed document without it: a digest is rendered by
 * something that treats its own markup as instructions, so a title
 * somebody else wrote is not inert text.
 *
 * Everything but the prose is then folded to ONE line. A heading, a
 * bullet and a `key: value` pair each occupy part of a line, so a
 * newline inside one would end the construct early and leave the rest
 * of the value as markup in its own right. The prose is the one place
 * a line break means what it says.
 *
 * ## What a body looks like
 *
 * ```text
 * <the briefing prose, whole>
 *
 * ## Gauges (2)
 *
 * - 501 (score 0)
 *   - gauge: north ridge
 * - 502
 *
 * ## Unfiled (0)
 *
 * ## Errors from the previous run (1)
 *
 * - the entry, as the column carried it
 * ```
 *
 * The second section is one that was read and held nothing; a section
 * nothing was read for is the same line without the `(0)`.
 *
 * A finding is laid out by three of its members and no more. The id
 * identifies it, the score is the axis the digest ordered on, and the
 * fields are what the domain put there. The rest are joins —
 * `document_id`, `entity_id` — that resolve to nothing a reader can
 * follow out of a markdown file.
 *
 * ## The one thing dropped
 *
 * A `sections` entry that is not an object is left out. A section is
 * a heading and a count, and an entry that is neither names nothing a
 * reader could be shown. Every other member that cannot be shown
 * answers {@link UNREADABLE_MEMBER} in place instead, so it is
 * visible rather than quietly missing.
 *
 * Nothing here reads a file, resolves a destination or reaches a
 * network. That is the send-free rule this whole directory is held
 * to, and a composer that only returns text has nowhere to break it.
 */

import type { ExportRenderInput } from './index.js';

import { sanitizeUntrusted } from '../lib/sanitize-md.js';

/** The character an ATX heading is written with. */
const HEADING_CHARACTER = '#';

/** The shallowest heading markdown has. */
const MIN_HEADING_DEPTH = 1;

/** The deepest, past which the marks stop being a heading at all. */
const MAX_HEADING_DEPTH = 6;

/** A top-level list item. */
const BULLET = '- ';

/** One nested under it, at the two-space indent a list continues on. */
const SUB_BULLET = '  - ';

/** What separates two blocks of a markdown document. */
const BLOCK_SEPARATOR = '\n\n';

/** What separates two lines inside one block. */
const LINE_SEPARATOR = '\n';

/** Every run of line breaks, for the fold every inline value gets. */
const NEWLINE_RUN_RE = /[\r\n]+/g;

/**
 * The heading the previous run's failures are shown under.
 *
 * Exported, as the three markers below are, so a renderer or a case
 * names the text by the constant rather than by a second spelling of
 * it — the shape `ARTIFACT_PATH_REFUSALS` in `./artifact-path.ts`
 * sets for the same reason. All four are this module's own wording:
 * they are layout, not content, and no stored value says what a
 * banner, an unnamed section or an unreadable value should be
 * called.
 */
export const PREVIOUS_RUN_BANNER_HEADING = 'Errors from the previous run';

/**
 * The line shown when the previous run recorded its failures in a
 * shape `runs.errors` was not meant to hold.
 *
 * `DigestBanner.wellFormed` is the assembly reporting that rather
 * than repairing it, and reporting it here is the whole point of
 * carrying the member: a reader sees one opaque entry AND why it is
 * opaque. Only an explicit `false` produces this line — a payload
 * that says nothing about the shape is not accused of a bad one.
 */
export const MALFORMED_ERRORS_NOTE
  = 'The previous run recorded its failures in a shape nothing expected.';

/**
 * The heading a section that names itself nothing is given.
 *
 * Reachable only from a stored payload, since `assembleDigest`
 * refuses a category with no usable key. A section shown under this
 * word is still a section with a count and its findings under it,
 * which is more use than one silently left out.
 */
export const UNNAMED_SECTION_HEADING = 'Unnamed section';

/**
 * What stands in for a value that could not be written down.
 *
 * Three shapes reach it: a finding carrying no id at all, a findings
 * entry that is itself an absence, and a value `JSON.stringify`
 * refused. A value that merely is not a scalar does NOT — an object
 * id is shown as its own JSON, which is the stored value rather than
 * a marker standing in for it. Each of the three is a shape nothing
 * validated, and a visible marker is what keeps one from reading as
 * a member the row never had.
 */
export const UNREADABLE_MEMBER = '(unreadable)';

// ---------------------------------------------------------------------------
// Reading a payload nothing validated
// ---------------------------------------------------------------------------

/**
 * One section of the stored assembly, as much of it as this module
 * reads.
 *
 * Not `DigestSection` from `src/lib/digest-assemble.ts`, and the
 * difference is the point rather than a duplication. That interface
 * describes what the assembly ANSWERED; this one describes what a
 * stored `briefings.payload` might turn out to hold, which is a
 * weaker claim — the column is unannotated jsonb, the row may
 * predate a member, and nothing validates one on the way back out.
 * So every member here is read defensively below and none of them is
 * trusted from the type.
 */
interface StoredSection {
  /**
   * What to head the section with, as the payload spelt it.
   *
   * Raw: reducing it is the layout half below, so this half stays
   * one job — what the payload holds — and nothing is reduced twice.
   */
  readonly heading: string;

  /** How many findings it holds, or `null` when nothing was read. */
  readonly count: number | null;

  /** The findings under it, in the order the assembly fixed. */
  readonly findings: readonly unknown[];
}

/** The previous run's failures, as a stored payload carries them. */
interface StoredBanner {
  /** One entry per failure, whatever shape each arrived in. */
  readonly entries: readonly unknown[];

  /** `false` only when the payload says so. See the header. */
  readonly wellFormed: boolean;
}

/**
 * Whether a value is a plain keyed object.
 *
 * Arrays are excluded rather than merely unlikely: an array carries
 * numeric keys and would read as a section holding no heading, no
 * count and no findings, which is a heading nobody wrote rather than
 * an entry that could not be read.
 *
 * @param value - Anything at all, out of a stored payload.
 * @returns Whether it may be read by key.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * A stored value as the text a document shows, or `null` when it is
 * an absence rather than a value.
 *
 * `null` and `undefined` answer `null` — the absence the header
 * argues is left out rather than printed blank. Scalars answer their
 * own string conversion, and anything else is written as JSON, which
 * is what keeps a nested object legible instead of collapsing it to
 * the word every object converts to.
 *
 * The conversion is guarded because the value came out of a payload
 * nothing validated. A jsonb read cannot be circular, but this takes
 * `unknown` and a caller can hand it whatever it holds; refusing
 * there would turn one hostile field into a failed render.
 *
 * @param value - The stored value.
 * @returns Its text, or `null` when there is nothing to show.
 */
function renderValue(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (
    typeof value === 'number'
    || typeof value === 'boolean'
    || typeof value === 'bigint'
  ) {
    return String(value);
  }

  try {
    const written = JSON.stringify(value);

    return written === undefined
      ? null
      : written;
  } catch {
    return UNREADABLE_MEMBER;
  }
}

/**
 * A section's count, or `null` when the payload does not carry one.
 *
 * Anything that is not a finite number reads as absence, which is the
 * safe direction of the law the header states: a count nobody can
 * read is a reading nobody took, and answering `0` for it would
 * claim the section was looked at and found empty.
 *
 * @param value - The stored `count` member.
 * @returns The count, or `null`.
 */
function readCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : null;
}

/**
 * A finding's score as the text to show, or `null` when it has none.
 *
 * A string is read as readily as a number because a `numeric` column
 * reaching a Code node through a Postgres node arrives as one rather
 * than lose digits, and it is that value the assembly stored. The
 * string is shown as it was stored rather than re-formatted through
 * a float, so a score with more precision than a double holds keeps
 * every digit it was written with.
 *
 * @param value - The stored `score` member.
 * @returns The score as text, or `null` when it was not measured.
 */
function readScore(value: unknown): string | null {
  if (typeof value === 'number') {
    return Number.isFinite(value)
      ? String(value)
      : null;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    return Number.isFinite(Number(value))
      ? value.trim()
      : null;
  }

  return null;
}

/**
 * What to head a stored section with: its own heading, its key, or
 * the word for a section that names itself nothing.
 *
 * The key is the fallback rather than a synonym. `DigestSection`
 * keeps the two apart because a heading is free text a domain may
 * change and a key is what the taxonomy is joined by — so a payload
 * carrying only the key is showing the text an operator typed, which
 * is the honest thing to show.
 *
 * @param section - The stored section, read by key.
 * @returns The heading, before it is reduced.
 */
function readHeading(section: Record<string, unknown>): string {
  const heading = section['heading'];

  if (typeof heading === 'string' && heading.trim() !== '') {
    return heading;
  }

  const key = section['key'];

  if (typeof key === 'string' && key.trim() !== '') {
    return key;
  }

  return UNNAMED_SECTION_HEADING;
}

/**
 * Every section a stored payload holds, in the order it holds them.
 *
 * Answers an empty list for a payload that is not the assembly's
 * shape, which is what makes a hand-written briefing render as its
 * prose alone. See the header for why nothing is assembled here to
 * fill the gap.
 *
 * @param payload - The `briefings.payload` value, unvalidated.
 * @returns The sections, read defensively.
 */
function readSections(payload: unknown): readonly StoredSection[] {
  if (!isRecord(payload)) {
    return [];
  }

  const sections = payload['sections'];

  if (!Array.isArray(sections)) {
    return [];
  }

  return sections.filter(isRecord)
    .map((section) => ({
      heading: readHeading(section),
      count: readCount(section['count']),
      findings: Array.isArray(section['findings'])
        ? section['findings']
        : [],
    }));
}

/**
 * The previous run's failures, or `null` when the payload records
 * none.
 *
 * `null` covers three states a renderer treats alike: no banner, a
 * banner that is not an object, and one whose entries are not a
 * list. Each means there is nothing to show, and a heading with
 * nothing under it is what `DigestAssembly.banner` being nullable
 * exists to prevent.
 *
 * @param payload - The `briefings.payload` value, unvalidated.
 * @returns The banner, or `null`.
 */
function readBanner(payload: unknown): StoredBanner | null {
  if (!isRecord(payload)) {
    return null;
  }

  const banner = payload['banner'];

  if (!isRecord(banner)) {
    return null;
  }

  const entries = banner['entries'];

  if (!Array.isArray(entries)) {
    return null;
  }

  return { entries, wellFormed: banner['wellFormed'] !== false };
}

// ---------------------------------------------------------------------------
// Laying it out
// ---------------------------------------------------------------------------

/**
 * Untrusted text, neutralized and folded onto one line.
 *
 * The fold is what makes a value safe to put INSIDE a construct: a
 * heading, a bullet and a `key: value` pair each occupy part of a
 * line, so a newline in one of them would close the construct early
 * and leave the remainder standing as markup of its own. Runs
 * collapse to a single space rather than to nothing, so two words
 * either side of a line break stay two words.
 *
 * @param text - The untrusted text.
 * @returns The same words, neutralized, on one line.
 */
function reduceInline(text: string): string {
  return sanitizeUntrusted(text).replace(NEWLINE_RUN_RE, ' ');
}

/**
 * One heading line, carrying its count when there is one.
 *
 * The parentheses are the whole of the null-vs-zero law as a reader
 * meets it: `(0)` says this bucket was read and was empty, and no
 * parentheses at all says nobody looked. See the header.
 *
 * @param depth - How deep the heading sits, already clamped.
 * @param text - The heading, already reduced.
 * @param count - The count, or `null` for an absence.
 * @returns The heading line.
 */
function headingLine(
  depth: number,
  text: string,
  count: number | null,
): string {
  const counted = count === null
    ? ''
    : ' (' + String(count) + ')';

  return HEADING_CHARACTER.repeat(depth) + ' ' + text + counted;
}

/**
 * One bullet over a value this module can only show whole.
 *
 * Used for a banner entry, which has no shape at all — an entry
 * names a file that would not parse, an endpoint that refused, or a
 * contract that no longer matches — and for a findings entry that is
 * not an object.
 *
 * @param entry - The stored value.
 * @returns The bullet line.
 */
function bulletLine(entry: unknown): string {
  return BULLET + reduceInline(renderValue(entry) ?? UNREADABLE_MEMBER);
}

/**
 * One finding, as its bullet and the sub-bullets under it.
 *
 * Three members and no more, for the reason the header gives. The
 * score follows the heading's shape exactly, so an unscored finding
 * carries no parentheses rather than a zero, and a field whose value
 * is an absence is left out rather than shown with nothing after the
 * colon.
 *
 * The field keys are laid out in sorted order rather than in the
 * order the record happened to carry them. That is a layout decision
 * and it is this module's to make: two rows of one domain written at
 * different times can hold the same keys in different orders, and a
 * digest whose findings each lay their fields out differently is
 * harder to read than one that does not.
 *
 * @param entry - One entry from a stored section, unvalidated.
 * @returns The lines, the bullet first.
 */
function findingLines(entry: unknown): readonly string[] {
  if (!isRecord(entry)) {
    return [bulletLine(entry)];
  }

  const score = readScore(entry['score']);
  const scored = score === null
    ? ''
    : ' (score ' + reduceInline(score) + ')';
  const identifier = renderValue(entry['id']) ?? UNREADABLE_MEMBER;
  const lines = [BULLET + reduceInline(identifier) + scored];
  const fields = entry['fields'];

  if (!isRecord(fields)) {
    return lines;
  }

  for (const key of Object.keys(fields).sort()) {
    const value = renderValue(fields[key]);

    if (value !== null) {
      lines.push(SUB_BULLET + reduceInline(key) + ': ' + reduceInline(value));
    }
  }

  return lines;
}

/**
 * One section: its heading, then its findings when it holds any.
 *
 * Two blocks rather than one, so the list is separated from the
 * heading by a blank line — and a section holding nothing is its
 * heading alone, which is what a read-and-empty bucket looks like.
 *
 * @param section - The section, as the payload carried it.
 * @param depth - How deep its heading sits, already clamped.
 * @returns The blocks, in document order.
 */
function sectionBlocks(
  section: StoredSection,
  depth: number,
): readonly string[] {
  const heading = headingLine(
    depth,
    reduceInline(section.heading),
    section.count,
  );
  const lines = section.findings.flatMap(findingLines);

  return lines.length === 0
    ? [heading]
    : [heading, lines.join(LINE_SEPARATOR)];
}

/**
 * The banner section, or nothing at all.
 *
 * PRESENT ONLY WHEN THE RUN RECORDED SOMETHING. A banner that is
 * absent, unreadable or empty answers no blocks, so no document ever
 * carries a failures heading with nothing under it — which is the
 * state `DigestAssembly.banner` is nullable to avoid, kept here
 * rather than undone at the last step.
 *
 * The count in the heading is the number of entries, which is a
 * measured quantity and so is always shown.
 *
 * @param banner - The banner, or `null` when none was recorded.
 * @param depth - How deep its heading sits, already clamped.
 * @returns The blocks, or an empty list.
 */
function bannerBlocks(
  banner: StoredBanner | null,
  depth: number,
): readonly string[] {
  if (banner === null || banner.entries.length === 0) {
    return [];
  }

  const heading = headingLine(
    depth,
    PREVIOUS_RUN_BANNER_HEADING,
    banner.entries.length,
  );
  const entries = banner.entries.map(bulletLine)
    .join(LINE_SEPARATOR);

  return banner.wellFormed
    ? [heading, entries]
    : [heading, MALFORMED_ERRORS_NOTE, entries];
}

/**
 * A heading depth markdown can carry.
 *
 * Clamped rather than refused: a depth outside the range is a
 * renderer's own literal being wrong, and answering a document whose
 * headings are one level off is more use to whoever has to notice
 * than a render that failed. A value that is not a number at all
 * takes the shallowest.
 *
 * @param depth - What the renderer asked for.
 * @returns A depth between {@link MIN_HEADING_DEPTH} and
 * {@link MAX_HEADING_DEPTH}.
 */
function clampDepth(depth: number): number {
  if (!Number.isFinite(depth)) {
    return MIN_HEADING_DEPTH;
  }

  const whole = Math.trunc(depth);

  return Math.min(Math.max(whole, MIN_HEADING_DEPTH), MAX_HEADING_DEPTH);
}

// ---------------------------------------------------------------------------
// The composition
// ---------------------------------------------------------------------------

/**
 * The one thing a markdown renderer decides for itself about the
 * body.
 *
 * One member, and it is the axis `./obsidian-md.ts` and
 * `./notion-md.ts` genuinely differ on. Anything a renderer wants to
 * put ABOVE the body — front matter, a title — it writes itself,
 * because a preamble is the renderer's own and composing one here
 * would be this module deciding what each surface accepts.
 */
export interface MarkdownBodyOptions {
  /**
   * The heading level a section takes, with the banner at the same
   * level.
   *
   * Required rather than defaulted, so a renderer states its depth
   * where a reader of that renderer can see it, and a second member
   * added here reddens both call sites rather than quietly taking a
   * value neither chose.
   */
  readonly headingDepth: number;
}

/**
 * Compose the markdown body both markdown renderers place under
 * their own preamble.
 *
 * The prose first, then every stored section in the order the
 * assembly fixed, then the previous run's failures when it recorded
 * any. Pure: no clock, no filesystem, no network, and nothing read
 * that is not in the input — so two calls over one input answer the
 * same bytes.
 *
 * Only {@link ExportRenderInput.briefing} is read. The findings
 * beside it are the same rows the stored sections already hold, in
 * the same order, and a format that lays them out one at a time
 * rather than under headings reads them directly — see `./rss.ts`.
 * Reading them HERE would mean sectioning them here, which is the
 * re-derivation the header refuses and which `ExportFindingRow`
 * could not support anyway.
 *
 * Never throws for any stored payload. It can still throw for a
 * field whose string conversion throws, which is
 * {@link sanitizeUntrusted}'s own documented ending and the one a
 * caller has to be ready for.
 *
 * @param input - The four stored rows this render is of.
 * @param options - The depth this renderer heads sections at.
 * @returns The body, ending in a newline, or `''` when the briefing
 * has neither prose nor a readable structure.
 */
export function composeMarkdownBody(
  input: ExportRenderInput,
  options: MarkdownBodyOptions,
): string {
  const depth = clampDepth(options.headingDepth);
  const { body, payload } = input.briefing;
  const blocks: string[] = [];
  const prose = body === null
    ? ''
    : sanitizeUntrusted(body).trim();

  if (prose !== '') {
    blocks.push(prose);
  }

  for (const section of readSections(payload)) {
    blocks.push(...sectionBlocks(section, depth));
  }

  blocks.push(...bannerBlocks(readBanner(payload), depth));

  return blocks.length === 0
    ? ''
    : blocks.join(BLOCK_SEPARATOR) + LINE_SEPARATOR;
}
