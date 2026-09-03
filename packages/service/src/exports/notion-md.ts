/**
 * @packageDocumentation
 * notion-md — the `notion_md` export: one page per digest, written in
 * the markdown subset the surface it is imported into accepts.
 *
 * THE SAME TEXT AS ITS SIBLING, UNDER A DIFFERENT COVER. Everything a
 * reader sees below the preamble is `./markdown-body.ts`'s
 * composition over the same four stored rows, so a period reads the
 * same here as it does in a vault. This module writes no sentence
 * about a digest, lays out no finding and re-orders nothing. What it
 * decides is the preamble, the depth the sections beneath it are
 * headed at, and the name the file takes.
 *
 * The export is one-way and nothing here reads a destination, opens a
 * file, resolves a path on the operator's machine or asks whether a
 * page of this name is already there. The renderer answers text and a
 * relative name; every question about where those land is asked after
 * it has returned, by the caller that resolved the connector. The
 * consequence `./obsidian-md.ts` draws from that holds here for the
 * same reason: a digest that came to nothing is still written,
 * because nothing downstream can tell an absent page from an export
 * that never ran.
 *
 * ## What one page is
 *
 * ```text
 * # rainfall-bulletin 2026-08-30
 * - domain: rainfall-bulletin
 * - period: 2026-08-30
 * - generated: 2026-08-30T00:00:00.000Z
 *
 * <the shared body, at heading depth two>
 * ```
 *
 * A title and the three facts under it, with no blank line between
 * them: heading and list are ONE preamble, and separating them would
 * make the field list read as the page's first content block rather
 * than as part of its header. The first blank line in a document is
 * therefore where the shared body starts, which is also how
 * `./notion-md.test.ts` reads one.
 *
 * The three facts are the ones the sibling carries and for the same
 * reasons — the domain this page belongs to, the period it covers and
 * the moment the briefing was written, the last two read out of the
 * one stamp `briefings` has. A field whose value cannot be read is
 * left out rather than written blank, and the connector, the
 * subscription and the run are deliberately absent: the first is an
 * address a renderer never learns, the second a standing schedule in
 * a document about a period, the third a fact about the pipeline.
 *
 * ## What differs from `./obsidian-md.ts`, and only this
 *
 * THE PREAMBLE, which is the first difference and the one the second
 * follows from. A YAML front-matter block is not markdown: it is a
 * convention a vault reads before rendering, and a surface that does
 * not read it renders the fence as a rule and the fields as three
 * lines of stray text under it. So the same facts are written as
 * blocks the subset holds — an ATX heading and a bulleted list — and
 * arrive as a title and a list rather than as noise.
 *
 * THE HEADING DEPTH. Sections take `##` here where the sibling takes
 * `#`. That is not a second preference: the preamble now occupies the
 * top level, so a section at `#` would stand level with the page's
 * own title and the document would have two things claiming to be
 * what it is about. In the sibling nothing occupies that level — the
 * file name is the note's title — so a section takes the shallowest
 * heading markdown has.
 *
 * Everything else is the same by construction rather than by
 * agreement: the same input, the same composer, the same path rule,
 * the same media type, the same refusal and the same purity. The
 * subset question is settled by that sharing, because the composer
 * emits ATX headings, paragraphs, bullets and one level of nested
 * bullet and nothing else — no table, no raw HTML, no reference link.
 * The one construct the pair does not share is the sibling's fence,
 * which is exactly the difference above.
 *
 * ## Why two modules rather than one renderer taking a flag
 *
 * THE TWO DIFFERENCES ARE NOT INDEPENDENT. The depth follows from the
 * preamble, so a flag would offer four combinations of which two are
 * wrong: a fenced block with `##` gives a page a rule, three stray
 * lines and no title, and a visible title with `#` puts every section
 * level with it. A parameter that must not be varied freely is not a
 * parameter, and a renderer holding one would be a place for the next
 * surface to add a third.
 *
 * {@link ExportRenderer.format} IS ONE VALUE PER RENDERER, and the
 * registry reaches a renderer BY that value. A flagged renderer would
 * have to be told at the call site which format it was answering as —
 * which is precisely what nothing at the call site knows, the
 * argument `./index.ts` makes about the type parameters it dropped
 * when the input was narrowed onto stored rows.
 *
 * AND EACH PREAMBLE IS ARGUED FROM WHAT ONE SURFACE DOES with a
 * document. That argument has to be where a reader of that surface's
 * renderer will meet it. A flag names what differs and leaves nowhere
 * to say why, so whoever finds `{ frontMatter: 'yaml' }` at a call
 * site learns the shape and none of the reason for it.
 *
 * ## Three readings written twice
 *
 * {@link readStamp}, {@link periodOf} and {@link pageStem} are the
 * sibling's, copied deliberately. Importing one renderer into another
 * would make the pair a hierarchy and put a change one surface needs
 * one edit away from moving the other's documents, which is the
 * coupling two modules exist to prevent.
 *
 * The price is fifteen lines written twice, and it is paid where a
 * case can see it: `./notion-md.test.ts` holds the period, the stamp
 * and the path this module answers equal to the sibling's over one
 * input. A drift in either copy is then reported by a case, rather
 * than by two documents about one period disagreeing about which
 * period it was.
 *
 * ## Why nothing here is quoted, folded or reduced
 *
 * Every preamble value is produced by one of exactly two things.
 * {@link slugify} answers lowercase letters, digits and hyphens and
 * nothing else, and `Date.prototype.toISOString` answers a fixed
 * ASCII shape whose only punctuation is hyphens, colons, a dot, a `T`
 * and a `Z`. Neither alphabet holds a newline, a `#` or a hyphen
 * followed by a space, so no value here can end its own line, open a
 * heading of its own or start a list item — which is why the fold
 * `./markdown-body.ts` applies to every inline position it composes
 * would be unreachable code here rather than a missing guard. The
 * argument is held as a reading rather than left as a paragraph:
 * `./notion-md.test.ts` counts the preamble's LINES over a hostile
 * domain slug.
 *
 * A field added here whose value came from stored text would break
 * that argument, and no reduction in this module would repair it —
 * such a field belongs in the body, where `sanitizeUntrusted` already
 * runs over everything.
 *
 * ## The one refusal
 *
 * A digest whose path cannot be composed answers NO artifact. The
 * reachable cause is a domain slug whose whole content reduces to
 * nothing, which is a real stored state rather than a malformed one.
 * `./artifact-path.ts` owns that judgement; this module reads its
 * answer and stops.
 *
 * ## Two calls over one input answer the same bytes
 *
 * No clock is read, no locale is consulted and no environment is
 * looked at. The one date this module formats goes through
 * `toISOString`, which is UTC and locale-independent, and the field
 * ORDER comes from {@link NOTION_PREAMBLE_KEYS} rather than from the
 * order an object happened to be built in.
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
 * Markdown, and the same value the sibling declares: what an artifact
 * holds is markdown either way, and the preamble is a convention on
 * top of it rather than a different document format.
 */
export const NOTION_MEDIA_TYPE = 'text/markdown';

/**
 * The extension the page takes.
 *
 * A renderer literal rather than stored text, which is why
 * `buildArtifactPath` does not reduce it — see that module's header
 * for the asymmetry and for what still checks it.
 */
export const NOTION_EXTENSION = 'md';

/**
 * The depth the shared body heads its sections at.
 *
 * Two, because the preamble occupies the level above. Stated as a
 * constant rather than written at the call site so that the one axis
 * this renderer differs from its sibling on is a difference a reader
 * can find by looking at two names.
 */
export const NOTION_HEADING_DEPTH = 2;

/**
 * What opens the title line: an ATX heading at the top level.
 *
 * Exported so a case names the construct by this constant rather than
 * by a second spelling of it, the shape `FRONT_MATTER_FENCE` in
 * `./obsidian-md.ts` sets for the same reason.
 */
export const NOTION_TITLE_PREFIX = '# ';

/** What opens each preamble field: one list item. */
export const NOTION_FIELD_BULLET = '- ';

/**
 * The preamble fields, in the order a page carries them.
 *
 * The ORDER is this list rather than the order an object was built
 * in, so the bytes cannot move because somebody rewrote a literal.
 * The three are argued in the header, along with what is deliberately
 * not among them.
 */
export const NOTION_PREAMBLE_KEYS = [
  'domain',
  'period',
  'generated',
] as const;

/** One member of {@link NOTION_PREAMBLE_KEYS}. */
export type NotionPreambleKey = (typeof NOTION_PREAMBLE_KEYS)[number];

/** What separates two lines of one artifact. */
const LINE_SEPARATOR = '\n';

/** What sits between a preamble key and its value. */
const FIELD_SEPARATOR = ': ';

/** What joins the readable parts of a page name. */
const NAME_SEPARATOR = '-';

/** What separates the two halves of the title. */
const TITLE_SEPARATOR = ' ';

/** How many characters of an ISO stamp are the calendar day. */
const PERIOD_LENGTH = 10;

/**
 * The format this renderer serves, named once.
 *
 * Once rather than at each of the two places it is written into,
 * because two spellings of one literal is two things to keep in step
 * and the registry selects on this value.
 */
const FORMAT: ExportFormat = 'notion_md';

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
 * The sibling's, copied for the reason the header gives, and held
 * equal to it by a case rather than by review.
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
 * is carried beside it so the page says which moment of that day the
 * reading was cut at rather than implying the whole of it.
 *
 * @param stamp - An ISO instant, as {@link readStamp} answered it.
 * @returns The calendar day, in UTC.
 */
function periodOf(stamp: string): string {
  return stamp.slice(0, PERIOD_LENGTH);
}

/**
 * The stem of the page name: the period and the briefing row.
 *
 * The row id is what supplies uniqueness, which the slugger says it
 * cannot: the reduction collapses rather than encodes, so two
 * headings can answer one slug and only a stored id cannot. The
 * period leads because that is what a person scanning a folder is
 * looking for, and it drops out entirely when the stamp could not be
 * read rather than leaving a hyphen with nothing before it.
 *
 * @param stamp - The briefing stamp, or `null` when unreadable.
 * @param briefingId - The `briefings.id` this page is of.
 * @returns The stem, before it is reduced.
 */
function pageStem(stamp: string | null, briefingId: number): string {
  const identifier = String(briefingId);

  return stamp === null
    ? identifier
    : periodOf(stamp) + NAME_SEPARATOR + identifier;
}

// ---------------------------------------------------------------------------
// The preamble
// ---------------------------------------------------------------------------

/** One preamble field, already reduced to text. */
interface PreambleField {
  /** Which of {@link NOTION_PREAMBLE_KEYS} this is. */
  readonly key: NotionPreambleKey;

  /**
   * The value, from {@link slugify} or from `toISOString` and from
   * nothing else. See the header for why that is what leaves it
   * unquoted and unfolded.
   */
  readonly value: string;
}

/**
 * The fields one page carries, in the order the roster fixes.
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
function preambleFields(
  slug: string,
  stamp: string | null,
): readonly PreambleField[] {
  const fields: PreambleField[] = [{ key: 'domain', value: slug }];

  if (stamp !== null) {
    fields.push({ key: 'period', value: periodOf(stamp) });
    fields.push({ key: 'generated', value: stamp });
  }

  return fields;
}

/**
 * The title line: what the page is about, at the top level.
 *
 * The domain and the period it covers, from the slug rather than from
 * `domains.name` — the name is free text somebody may rename between
 * two renders, and it would also be the one value in this block the
 * header's no-reduction argument could not cover.
 *
 * @param slug - The domain slug, already reduced.
 * @param stamp - The briefing stamp, or `null` when unreadable.
 * @returns The heading line, without its terminator.
 */
function titleLine(slug: string, stamp: string | null): string {
  const named = stamp === null
    ? slug
    : slug + TITLE_SEPARATOR + periodOf(stamp);

  return NOTION_TITLE_PREFIX + named;
}

/**
 * The whole preamble: the title and its field list, ending in a
 * newline and carrying no blank line of its own.
 *
 * One block, for the reason the header gives — and it is what makes
 * the first blank line in a document the start of the shared body.
 *
 * @param slug - The domain slug, already reduced.
 * @param stamp - The briefing stamp, or `null` when unreadable.
 * @returns The block, ready for the body to be placed under.
 */
function preambleBlock(slug: string, stamp: string | null): string {
  const fields = preambleFields(slug, stamp);
  const lines = fields.map(
    (field) => NOTION_FIELD_BULLET + field.key
      + FIELD_SEPARATOR + field.value,
  );

  return [titleLine(slug, stamp), ...lines].join(LINE_SEPARATOR)
    + LINE_SEPARATOR;
}

// ---------------------------------------------------------------------------
// The renderer
// ---------------------------------------------------------------------------

/**
 * Render one stored digest as one Notion page.
 *
 * The preamble, a blank line and the shared body — or the preamble
 * alone when the digest came to nothing, which is a page saying so
 * rather than an absence a reader would have to interpret. See the
 * header for why an absence is not on offer here.
 *
 * Answers an empty list only when the path cannot be composed, which
 * `./artifact-path.ts` decides and this function does not second-
 * guess. Never throws for any stored row; the one ending a caller has
 * to be ready for is `sanitizeUntrusted`'s, over a field whose string
 * conversion throws.
 *
 * Pure. Nothing is read that is not in the input, nothing is written
 * anywhere, and the returned artifacts are the only way anything
 * leaves this call.
 *
 * @param input - The four stored rows this render is of.
 * @returns One artifact, or none when the path was refused.
 */
export function renderNotionMarkdown(
  input: ExportRenderInput,
): ExportArtifact[] {
  const slug = slugify(input.domain.slug);
  const stamp = readStamp(input.briefing.generatedAt);
  const built = buildArtifactPath({
    folders: [slug],
    name: pageStem(stamp, input.briefing.id),
    extension: NOTION_EXTENSION,
  });

  if (!built.ok) {
    return [];
  }

  const preamble = preambleBlock(slug, stamp);
  const body = composeMarkdownBody(input, {
    headingDepth: NOTION_HEADING_DEPTH,
  });

  return [{
    format: FORMAT,
    path: built.path,
    mediaType: NOTION_MEDIA_TYPE,
    body: body === ''
      ? preamble
      : preamble + LINE_SEPARATOR + body,
  }];
}

/**
 * The `notion_md` renderer, as the registry names it.
 *
 * The declaration shape `LISTING_API_DECLARATION` in
 * `src/sources/listing-api.ts` sets: the behaviour is an exported
 * function a case can call directly, and this const is the one member
 * a registry entry needs.
 */
export const NOTION_MD_RENDERER: ExportRenderer = {
  format: FORMAT,
  render: renderNotionMarkdown,
};
