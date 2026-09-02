/**
 * @packageDocumentation
 * obsidian-md — the `obsidian_md` export: one note per digest, written
 * into a vault this module can neither see nor read back.
 *
 * THE EXPORT IS ONE-WAY. A vault is somebody else's directory on
 * somebody else's machine, and this renderer's only relationship with
 * it is that a caller may later place what comes back. Nothing here
 * reads a destination, opens a file, resolves a path on the operator's
 * machine, lists what a vault already holds, or asks whether a note of
 * this name is there. The renderer answers text and a relative name;
 * every question about where those land is asked after it has
 * returned, by the caller that resolved the connector.
 *
 * That is not merely the send-free rule restated. It fixes what one
 * note has to CONTAIN. Because nothing reads the vault back, a note
 * absent from it is indistinguishable from an export that never ran —
 * so a digest that came to nothing is still written, carrying the
 * front matter that says which period it was and a body that says
 * there was nothing in it. A renderer answering no artifact for a
 * quiet week would leave a gap a reader could only interpret as a
 * fault, and the one thing nothing downstream can do is ask.
 *
 * ## What one note is
 *
 * Front matter, then the body `./markdown-body.ts` composes for both
 * markdown renderers. Everything a reader sees below the second fence
 * is that shared composition — this module writes no sentence about a
 * digest and lays no finding out. What it decides is the preamble,
 * the heading depth beneath it and the name the file takes.
 *
 * ```text
 * ---
 * domain: rainfall-bulletin
 * period: 2026-08-30
 * generated: 2026-08-30T00:00:00.000Z
 * ---
 *
 * <the shared body, at heading depth one>
 * ```
 *
 * The three front-matter fields are the domain this note belongs to,
 * the period it covers and the moment the briefing was written. The
 * last two come out of one column, and the honest reading of that is
 * stated at {@link readStamp}: `briefings.generated_at` is the only
 * stamp the row has, so the period is the DAY it was generated on and
 * the stamp beside it says which moment of that day the reading was
 * cut at. A field whose value cannot be read is left out rather than
 * written blank, which is the same law `./markdown-body.ts` applies to
 * a section count and to a finding score.
 *
 * WHAT IS DELIBERATELY NOT IN THE FRONT MATTER: the connector, the
 * subscription and the run. The first is an address and a renderer
 * never learns one; the second would put a standing schedule into a
 * document about a period; the third is a fact about the pipeline
 * rather than about what the period came to. The briefing is named in
 * the FILE name instead, which is where a reader looking for one row
 * would go.
 *
 * ## Why nothing here is quoted
 *
 * Every front-matter value is produced by one of exactly two things,
 * and neither can emit a character YAML reads as structure.
 * {@link slugify} answers lowercase letters, digits and hyphens and
 * nothing else, and `Date.prototype.toISOString` answers a fixed ASCII
 * shape whose only punctuation is hyphens, colons, a dot, a `T` and a
 * `Z`. No newline, no leading indicator, and no colon followed by a
 * space — which is the one sequence that would end a plain scalar
 * early. So the fields are written as plain scalars, and
 * `./obsidian-md.test.ts` holds the block's LINE COUNT over a hostile
 * domain slug rather than leaving that paragraph to stand alone.
 *
 * The consequence for a later edit is worth stating plainly: a field
 * added here whose value comes from stored text would break that
 * argument, and no reduction in this module would repair it. Such a
 * field belongs in the body, where `sanitizeUntrusted` already runs
 * over everything.
 *
 * ## Sections sit at the shallowest heading markdown has
 *
 * Obsidian titles a note by its FILE NAME, so nothing in the document
 * competes with a top-level heading and the body's sections take `#`.
 * That is the axis `./notion-md.ts` differs on, along with its own
 * front matter: the two renderers hand the same input to the same
 * composer and place what comes back under different covers, so the
 * text a reader gets is the same text in both vaults.
 *
 * ## The one refusal
 *
 * A digest whose path cannot be composed answers NO artifact. The
 * reachable cause is a domain slug whose whole content reduces to
 * nothing — a real stored state rather than a malformed one, since
 * `domains.slug` is free text and the reduction collapses rather than
 * encodes. Composing anyway would put the note at the vault root
 * under a name naming no domain, which for a one-way export is a file
 * nobody can trace and nothing can withdraw. `./artifact-path.ts`
 * owns that judgement; this module reads its answer and stops.
 *
 * ## Two calls over one input answer the same bytes
 *
 * No clock is read, no locale is consulted and no environment is
 * looked at. The one date this module formats is formatted through
 * `toISOString`, which is UTC and locale-independent — a renderer
 * reaching for a local-time formatter would answer different bytes on
 * two machines for one stored row, and the difference would show up
 * as a vault full of notes that disagree about what day it was. The
 * field ORDER comes from {@link OBSIDIAN_FRONT_MATTER_KEYS} rather
 * than from the order an object happened to be built in.
 */

import type {
  ExportArtifact,
  ExportFormat,
  ExportRenderInput,
  ExportRenderer,
} from './index.js';

import { slugify } from '../lib/sanitize-md.js';

import { buildArtifactPath } from './artifact-path.js';
import { composeMarkdownBody } from './markdown-body.js';

/**
 * The media type every artifact this renderer answers carries.
 *
 * Markdown and not a vault-specific type, because what an artifact
 * holds is markdown: the front matter is a convention on top of it
 * rather than a different document format, and a caller placing the
 * bytes is placing a markdown file.
 */
export const OBSIDIAN_MEDIA_TYPE = 'text/markdown';

/**
 * The extension the note takes.
 *
 * A renderer literal rather than stored text, which is why
 * `buildArtifactPath` does not reduce it — see that module's header
 * for the asymmetry and for what still checks it.
 */
export const OBSIDIAN_EXTENSION = 'md';

/**
 * The depth the shared body heads its sections at. See the header.
 *
 * Stated as a constant rather than written at the call site so that
 * `./notion-md.ts` differing on it is a difference a reader can find
 * by looking at two names.
 */
export const OBSIDIAN_HEADING_DEPTH = 1;

/**
 * The line that opens and closes a front-matter block.
 *
 * Exported so a case names the fence by this constant rather than by
 * a second spelling of it, the shape `PREVIOUS_RUN_BANNER_HEADING` in
 * `./markdown-body.ts` sets for the same reason.
 */
export const FRONT_MATTER_FENCE = '---';

/**
 * The front-matter fields, in the order a note carries them.
 *
 * The ORDER is this list rather than the order an object was built
 * in, so the bytes cannot move because somebody rewrote a literal.
 * The three are argued in the header, along with what is deliberately
 * not among them.
 */
export const OBSIDIAN_FRONT_MATTER_KEYS = [
  'domain',
  'period',
  'generated',
] as const;

/** One member of {@link OBSIDIAN_FRONT_MATTER_KEYS}. */
export type ObsidianFrontMatterKey =
  (typeof OBSIDIAN_FRONT_MATTER_KEYS)[number];

/** What separates two lines of one artifact. */
const LINE_SEPARATOR = '\n';

/** What sits between a front-matter key and its value. */
const FIELD_SEPARATOR = ': ';

/** What joins the readable parts of a note name. */
const NAME_SEPARATOR = '-';

/** How many characters of an ISO stamp are the calendar day. */
const PERIOD_LENGTH = 10;

/**
 * The format this renderer serves, named once.
 *
 * Once rather than at each of the two places it is written into,
 * because two spellings of one literal is two things to keep in step
 * and the registry selects on this value.
 */
const FORMAT: ExportFormat = 'obsidian_md';

// ---------------------------------------------------------------------------
// Reading the one column two fields come out of
// ---------------------------------------------------------------------------

/**
 * The briefing's stamp as text, or `null` when it cannot be read.
 *
 * `ExportBriefingRow.generatedAt` is typed as a `Date` and a row read
 * through the ORM supplies one, but the type admits an invalid date —
 * `new Date` over text it cannot parse is still a `Date` — and
 * `toISOString` THROWS on one. A renderer that threw would fail a
 * whole export run over a member two fields of a preamble are made
 * of, so the reading is guarded and its failure is an absence.
 *
 * UTC, through `toISOString` and never through a local-time
 * formatter, for the reason the header gives: the same stored row has
 * to answer the same bytes on every machine.
 *
 * @param generatedAt - The stamp, as the row carried it.
 * @returns The ISO instant, or `null` when there is nothing to show.
 */
function readStamp(generatedAt: Date): string | null {
  const moment = generatedAt instanceof Date
    ? generatedAt.getTime()
    : Number.NaN;

  return Number.isFinite(moment)
    ? generatedAt.toISOString()
    : null;
}

/**
 * The period an ISO stamp names: the calendar day it fell on.
 *
 * THE HONEST LIMIT IS THE COLUMN'S OWN. No column holds the span a
 * briefing covers, so what a renderer has is the moment it was
 * written plus the writer's convention that a briefing is generated
 * at the end of what it covers. This answers the day, and the stamp
 * is carried beside it so the note says which moment of that day the
 * reading was cut at rather than implying the whole of it.
 *
 * @param stamp - An ISO instant, as {@link readStamp} answered it.
 * @returns The calendar day, in UTC.
 */
function periodOf(stamp: string): string {
  return stamp.slice(0, PERIOD_LENGTH);
}

// ---------------------------------------------------------------------------
// The preamble
// ---------------------------------------------------------------------------

/** One front-matter field, already reduced to text. */
interface FrontMatterField {
  /** Which of {@link OBSIDIAN_FRONT_MATTER_KEYS} this is. */
  readonly key: ObsidianFrontMatterKey;

  /**
   * The value, from {@link slugify} or from `toISOString` and from
   * nothing else. See the header for why that is what leaves it
   * unquoted.
   */
  readonly value: string;
}

/**
 * The fields one note carries, in the order the roster fixes.
 *
 * A field whose value could not be read is left OUT rather than
 * written blank, which is the law `./markdown-body.ts` applies to a
 * section count and to a finding score: a key with nothing after it
 * reads as a value somebody measured and found empty.
 *
 * @param slug - The domain slug, already reduced.
 * @param stamp - The briefing stamp, or `null` when unreadable.
 * @returns The fields to write, in document order.
 */
function frontMatterFields(
  slug: string,
  stamp: string | null,
): readonly FrontMatterField[] {
  const fields: FrontMatterField[] = [{ key: 'domain', value: slug }];

  if (stamp !== null) {
    fields.push({ key: 'period', value: periodOf(stamp) });
    fields.push({ key: 'generated', value: stamp });
  }

  return fields;
}

/**
 * The front-matter block, fences included, ending in a newline.
 *
 * Plain scalars and no quoting, which the header argues from what
 * the two producers of a value here can emit.
 *
 * @param fields - The fields, in document order.
 * @returns The block, opened and closed by the fence.
 */
function frontMatterBlock(fields: readonly FrontMatterField[]): string {
  const lines = fields.map(
    (field) => field.key + FIELD_SEPARATOR + field.value,
  );

  return [FRONT_MATTER_FENCE, ...lines, FRONT_MATTER_FENCE]
    .join(LINE_SEPARATOR) + LINE_SEPARATOR;
}

/**
 * The stem of the note name: the period and the briefing row.
 *
 * The row id is what supplies uniqueness, which the slugger says it
 * cannot: the reduction collapses rather than encodes, so two
 * headings can answer one slug and only a stored id cannot. The
 * period leads because that is what a person scanning a vault folder
 * is looking for, and it drops out entirely when the stamp could not
 * be read rather than leaving a hyphen with nothing before it.
 *
 * @param stamp - The briefing stamp, or `null` when unreadable.
 * @param briefingId - The `briefings.id` this note is of.
 * @returns The stem, before it is reduced.
 */
function noteStem(stamp: string | null, briefingId: number): string {
  const identifier = String(briefingId);

  return stamp === null
    ? identifier
    : periodOf(stamp) + NAME_SEPARATOR + identifier;
}

// ---------------------------------------------------------------------------
// The renderer
// ---------------------------------------------------------------------------

/**
 * Render one stored digest as one Obsidian note.
 *
 * Front matter, a blank line and the shared body — or the front
 * matter alone when the digest came to nothing, which is a note
 * saying so rather than an absence a reader would have to interpret.
 * See the header for why an absence is not on offer here.
 *
 * Answers an empty list only when the path cannot be composed, which
 * `./artifact-path.ts` decides and this function does not second-
 * guess. Never throws for any stored row; the one ending a caller
 * has to be ready for is `sanitizeUntrusted`'s, over a field
 * whose string conversion throws.
 *
 * Pure. Nothing is read that is not in the input, nothing is written
 * anywhere, and the returned artifacts are the only way anything
 * leaves this call.
 *
 * @param input - The four stored rows this render is of.
 * @returns One artifact, or none when the path was refused.
 */
export function renderObsidianMarkdown(
  input: ExportRenderInput,
): ExportArtifact[] {
  const slug = slugify(input.domain.slug);
  const stamp = readStamp(input.briefing.generatedAt);
  const built = buildArtifactPath({
    folders: [slug],
    name: noteStem(stamp, input.briefing.id),
    extension: OBSIDIAN_EXTENSION,
  });

  if (!built.ok) {
    return [];
  }

  const preamble = frontMatterBlock(frontMatterFields(slug, stamp));
  const body = composeMarkdownBody(input, {
    headingDepth: OBSIDIAN_HEADING_DEPTH,
  });

  return [{
    format: FORMAT,
    path: built.path,
    mediaType: OBSIDIAN_MEDIA_TYPE,
    body: body === ''
      ? preamble
      : preamble + LINE_SEPARATOR + body,
  }];
}

/**
 * The `obsidian_md` renderer, as the registry names it.
 *
 * The declaration shape `LISTING_API_DECLARATION` in
 * `src/sources/listing-api.ts` sets: the behaviour is an exported
 * function a case can call directly, and this const is the one member
 * a registry entry needs.
 */
export const OBSIDIAN_MD_RENDERER: ExportRenderer = {
  format: FORMAT,
  render: renderObsidianMarkdown,
};
