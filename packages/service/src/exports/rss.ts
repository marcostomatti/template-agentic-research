/**
 * @packageDocumentation
 * rss — the `rss` export as ONE static file: a feed document composed
 * in memory and handed back as bytes.
 *
 * THERE IS NO SERVER HERE. No endpoint is mounted, no route is
 * declared, no port is opened and no request is ever answered by this
 * module. What `rss` names is a FILE FORMAT, and the whole of what
 * this renderer does is compose one document out of four stored rows
 * and return it. A feed is a file somebody else may later serve; that
 * somebody is the caller that resolved the connector, after every
 * renderer has returned.
 *
 * The word most likely to mislead a reader of this directory is
 * `feed`, so it is worth saying plainly what is absent. There is no
 * feed URL, no polling, no subscriber list, no HTTP client, no
 * fetching of anything a document might cite, and no reach of any
 * kind to a network. A renderer under `src/exports/` may not import a
 * transport, and this one — the one format whose name sounds like a
 * protocol — imports exactly what its two markdown siblings do.
 *
 * That is the send-free rule `./index.ts` argues at
 * {@link ExportRenderer}, and it is also why the document below names
 * nothing dereferenceable. See the URN section.
 *
 * ## What one file is
 *
 * ```text
 * <?xml version="1.0" encoding="UTF-8"?>
 * <rss version="2.0">
 *   <channel>
 *     <title>Rainfall bulletin</title>
 *     <link>urn:ar:domain:rainfall-bulletin</link>
 *     <description>Two gauges reported and one did not.</description>
 *     <pubDate>Sun, 30 Aug 2026 00:00:00 GMT</pubDate>
 *     <item>
 *       <title>Readings 501 (score 0)</title>
 *       <guid isPermaLink="false">urn:ar:finding:501</guid>
 *       <description>gauge: north ridge</description>
 *       <pubDate>Sat, 29 Aug 2026 06:00:00 GMT</pubDate>
 *     </item>
 *   </channel>
 * </rss>
 * ```
 *
 * The channel comes from the domain and the briefing; there is one
 * item per finding, in the order the caller selected them, which is
 * the order the digest assembly fixed. No item is dropped, re-ordered
 * or merged — a renderer lays out what it was handed.
 *
 * WHAT AN ITEM IS NOT FILED UNDER is a category. The sectioning of a
 * digest lives only in `briefings.payload`, and `ExportFindingRow`
 * carries no category key at all, so nothing here could file a row
 * under one. A feed is a flat list by construction rather than by
 * preference, which is also why this renderer reads
 * {@link ExportRenderInput.findings} directly where the markdown pair
 * reads the stored sections instead.
 *
 * ## Why nothing in this document is a URL
 *
 * RSS wants a `link` on a channel and offers `guid` on an item, and
 * both are conventionally addresses. A RENDERER HAS NO ADDRESS TO PUT
 * THERE. It never learns one: `ExportSubscriptionRow` carries a
 * connector id and not an endpoint, `ExportArtifact.path` is relative
 * to a destination resolved after this call, and inventing a public
 * URL would be this module guessing where an operator serves files.
 *
 * So both are URNs. A `urn:` is a URI that NAMES without locating —
 * no reader can turn one into a request — and `isPermaLink="false"`
 * on the guid is the format's own way of saying exactly that about an
 * identifier. The namespace is not a registered one, deliberately:
 * registering would be a claim about a global registry this project
 * has not made, and what matters is the scheme rather than the label
 * after it.
 *
 * An item is named by `findings.id` alone rather than by the domain
 * and the id, because the column is a table-wide key: scoping it
 * would add a component that distinguishes nothing.
 *
 * ## Escaping, and the characters escaping cannot reach
 *
 * {@link escapeXmlText} is the ONE route from a value to the
 * document, and it does two things in one pass because doing either
 * alone is unsafe.
 *
 * IT REMOVES WHAT XML CANNOT CARRY, FIRST. This is the half a reader
 * expects to be an escape and is not: XML 1.0 has no representation
 * for a C0 control other than tab, newline and return — not as a raw
 * byte and not as a numeric character reference either, so `&#1;` is
 * as illegal as the byte itself. A control character in a stored
 * field therefore cannot be escaped into safety; it can only be
 * dropped, and a document keeping one is a document no conforming
 * parser will read at all. Lone surrogates go the same way and for a
 * sharper reason: a JS string may hold one, UTF-8 cannot encode one,
 * and the declaration at the top of this file says UTF-8.
 *
 * DELETE (0x7f) IS KEPT, which is worth stating so its presence does
 * not read as an oversight. XML 1.0 permits it; only XML 1.1
 * restricts it, and this document declares 1.0.
 *
 * IT THEN ESCAPES ALL FIVE PREDEFINED ENTITIES, ampersand FIRST. The
 * order is the whole correctness of the pass: every replacement after
 * the first introduces an ampersand of its own, so an ampersand
 * escaped last would be escaped inside the escapes and `<` would
 * arrive as `&amp;lt;`. {@link XML_PREDEFINED_ENTITIES} is declared in
 * the order it is applied for that reason.
 *
 * The quote and the apostrophe need no escaping in element content
 * and are escaped anyway, so that one function's answer is safe in
 * BOTH positions. This document writes one attribute today
 * ({@link GUID_PERMALINK_ATTRIBUTE}, whose value is a literal), and a
 * value moved from a text position into an attribute position later
 * cannot become an injection because the escaper it already went
 * through covered that case too.
 *
 * ## Untrusted text is reduced before it is escaped
 *
 * {@link sanitizeUntrusted} runs over every stored string first — the
 * briefing prose, the display name, every field key and every field
 * value — and the escape follows it. Escaping alone would be enough
 * to make the document WELL-FORMED and is not enough to make it SAFE:
 * a feed reader conventionally renders an item description as HTML,
 * so text that survives the XML parse as `<script>` is markup again
 * on the other side. The reduction is what makes the parsed text
 * inert; the escape is what gets it through the parse unchanged. Two
 * layers answering two different questions.
 *
 * NOTHING IS FOLDED ONTO ONE LINE HERE, and that is a difference from
 * `./markdown-body.ts` rather than an omission. Markdown is
 * line-structured — a newline inside a heading or a bullet ends the
 * construct and leaves the remainder standing as markup — so that
 * composer folds every inline position. XML has no line-based syntax
 * at all: element content runs to its closing tag whatever line
 * breaks it carries. A fold here would be this module editing stored
 * text to no purpose.
 *
 * The one consequence is visible in the source of a multi-field item:
 * its `description` content is written flush against its tags across
 * several lines, because indenting the lines would put that
 * indentation INSIDE the text a reader shows. Layout indentation
 * stops where content begins.
 *
 * ## Two dates, one guard, and a failure that is not an exception
 *
 * The channel dates the briefing was generated and each item dates
 * its own `findings.created_at`. Both are RFC 822 as RSS wants them,
 * through `Date.prototype.toUTCString`, whose output format the
 * language specifies exactly — `Www, DD Mmm YYYY HH:mm:ss GMT`, in
 * English, in UTC, whatever locale the process is running under.
 *
 * THE GUARD IS NOT THE SIBLINGS' GUARD, though it looks like it.
 * `./obsidian-md.ts` guards its stamp because `toISOString` THROWS on
 * an invalid date. `toUTCString` does not throw: it answers the
 * literal text `Invalid Date`, which would be written into a
 * `pubDate` element as though it were a moment. Silent bad data
 * rather than a loud ending, so the reading is guarded on the
 * TIMESTAMP and a date that has none produces no element at all —
 * the same law `./markdown-body.ts` applies to a count and a score.
 *
 * ## Two calls over one input answer the same bytes
 *
 * No clock is read, no locale is consulted, no environment is looked
 * at and no counter is incremented. Every date comes from a stored
 * column through a formatter the language pins; the element ORDER
 * comes from {@link RSS_CHANNEL_ELEMENTS} and
 * {@link RSS_ITEM_ELEMENTS} rather than from the order an object
 * happened to be built in; and the fields of an item are laid out in
 * sorted key order, which is the layout decision
 * `./markdown-body.ts` makes for the same reason — two rows of one
 * domain written at different times can carry the same keys in
 * different orders.
 *
 * ## The one refusal
 *
 * A digest whose path cannot be composed answers NO artifact. The
 * reachable cause is a domain slug whose whole content reduces to
 * nothing, which is a real stored state rather than a malformed one.
 * `./artifact-path.ts` owns that judgement; this module reads its
 * answer and stops. Everything else is written: a period that held no
 * findings is a feed with no items, not an absence, for the reason
 * `./obsidian-md.ts` argues at length — nothing downstream reads a
 * destination back, so a missing file and an export that never ran
 * are the same thing to every reader of one.
 */

import type {
  ExportArtifact,
  ExportFindingRow,
  ExportFormat,
  ExportRenderInput,
  ExportRenderer,
} from './index.js';

import { displayNameFor } from '../lib/digest-assemble.js';
import { sanitizeUntrusted, slugify } from '../lib/sanitize-md.js';

import { buildArtifactPath } from './artifact-path.js';
import { UNREADABLE_MEMBER } from './markdown-body.js';

/**
 * The media type every artifact this renderer answers carries.
 *
 * The registered type for an RSS document, and an XML type rather
 * than `text/xml` because the document has its own registration.
 * What it does NOT imply is that anything serves it: a media type
 * describes bytes, and these bytes are a file.
 */
export const RSS_MEDIA_TYPE = 'application/rss+xml';

/**
 * The extension the file takes.
 *
 * `xml` rather than `rss`, because what is in the file is XML and
 * every tool that opens one by extension knows that name. A renderer
 * literal rather than stored text, which is why `buildArtifactPath`
 * does not reduce it — see that module's header for the asymmetry
 * and for what still checks it.
 */
export const RSS_EXTENSION = 'xml';

/** The version this document declares on its root element. */
export const RSS_VERSION = '2.0';

/**
 * The declaration every document opens with.
 *
 * UTF-8 is named rather than left to a parser's default, and it is
 * what makes the lone-surrogate removal in {@link escapeXmlText} a
 * requirement instead of a nicety: a surrogate that reached the
 * output could not be encoded under the encoding this line promises.
 */
export const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>';

/**
 * The five predefined entities, in the order they are applied.
 *
 * THE ORDER IS THE CORRECTNESS. The ampersand is first because every
 * replacement below introduces one; escaping it last would escape the
 * escapes and turn a `<` into `&amp;lt;`. A member added to this list
 * goes at the END for the same reason, never at the front.
 *
 * All five, including the two that need no escaping in element
 * content, so that one function's answer is safe in an attribute
 * value as well. See the header.
 */
export const XML_PREDEFINED_ENTITIES = [
  { character: '&', entity: '&amp;' },
  { character: '<', entity: '&lt;' },
  { character: '>', entity: '&gt;' },
  { character: '"', entity: '&quot;' },
  { character: '\'', entity: '&apos;' },
] as const;

/**
 * What a channel names itself: the domain, not an address.
 *
 * A `urn:` names without locating, which is the whole reason it is
 * here rather than a URL. See the header for why a renderer has no
 * address to write and why the namespace is deliberately unregistered.
 */
export const CHANNEL_URN_PREFIX = 'urn:ar:domain:';

/**
 * What an item names itself: the `findings` row and nothing else.
 *
 * The column is a table-wide key, so scoping the name by the domain
 * would add a component that distinguishes nothing.
 */
export const ITEM_URN_PREFIX = 'urn:ar:finding:';

/**
 * The one attribute this document writes.
 *
 * `false` says the guid beside it is an identifier and not an
 * address — the format's own way of saying what the URN already
 * says, and the reason a reader will not try to follow one.
 */
export const GUID_PERMALINK_ATTRIBUTE = 'isPermaLink';

/** Its value, which is fixed and is never read off a row. */
const GUID_PERMALINK_VALUE = 'false';

/**
 * The channel's elements, in the order a document carries them.
 *
 * The ORDER is this list rather than the order an object was built
 * in, so the bytes cannot move because somebody rewrote a literal.
 * Two of the four are omitted when the value behind them cannot be
 * read, which is the absence law rather than a gap in the roster.
 */
export const RSS_CHANNEL_ELEMENTS = [
  'title',
  'link',
  'description',
  'pubDate',
] as const;

/** One member of {@link RSS_CHANNEL_ELEMENTS}. */
export type RssChannelElement = (typeof RSS_CHANNEL_ELEMENTS)[number];

/**
 * An item's elements, in the order a document carries them.
 *
 * `category` is deliberately not among them: an item is not filed
 * under a section, for the reason the header gives.
 */
export const RSS_ITEM_ELEMENTS = [
  'title',
  'guid',
  'description',
  'pubDate',
] as const;

/** One member of {@link RSS_ITEM_ELEMENTS}. */
export type RssItemElement = (typeof RSS_ITEM_ELEMENTS)[number];

/**
 * Every code point XML 1.0 cannot carry, as a class built at run
 * time.
 *
 * Three populations, and each is REMOVED rather than escaped for the
 * reason the header gives — the format offers no representation for
 * any of them, so a numeric character reference is as illegal as the
 * raw byte.
 *
 * The C0 controls other than tab (0x09), newline (0x0a) and return
 * (0x0d), which the `Char` production admits and this class steps
 * around. Delete (0x7f) is NOT here: XML 1.0 permits it.
 *
 * The surrogate range, which under the `u` flag matches a LONE
 * surrogate and never a valid astral pair — the engine offers a pair
 * as one code point above the range. A lone one cannot be encoded as
 * UTF-8 at all, which is what {@link XML_DECLARATION} promises.
 *
 * The two non-characters at the end of the basic plane, which the
 * `Char` production also excludes.
 *
 * Assembled from code points rather than written as a literal class,
 * for the reason `src/lib/audit-log.ts` gives for the identical
 * construction: a control character inside a pattern literal is a
 * lint error here, and a source carrying one as a raw byte is a file
 * `git diff` renders as binary and POSIX grep reports no match in.
 *
 * Global, and used only with `String.prototype.replace`, which
 * resets `lastIndex` — a shared global pattern is a trap under
 * `test` and safe under `replace`.
 */
const UNREPRESENTABLE_RE = new RegExp(
  '['
  + String.fromCharCode(0x00) + '-' + String.fromCharCode(0x08)
  + String.fromCharCode(0x0b) + String.fromCharCode(0x0c)
  + String.fromCharCode(0x0e) + '-' + String.fromCharCode(0x1f)
  + String.fromCharCode(0xd800) + '-' + String.fromCharCode(0xdfff)
  + String.fromCharCode(0xfffe) + String.fromCharCode(0xffff)
  + ']',
  'gu',
);

/**
 * What labels a score in an item title.
 *
 * The same word `./markdown-body.ts` writes into a finding's bullet,
 * deliberately: a reader who has both a note and a feed open is
 * looking at one number under one name. The two are not shared as a
 * constant because that module builds its own inline, so this is a
 * second spelling and the header of the case file says so.
 */
const SCORE_LABEL = 'score';

/** What separates two lines of one document. */
const LINE_SEPARATOR = '\n';

/** What sits between a field key and its value. */
const FIELD_SEPARATOR = ': ';

/** What joins the readable parts of a file name. */
const NAME_SEPARATOR = '-';

/** What separates a display name from the row it heads. */
const TITLE_SEPARATOR = ' ';

/** How many characters of an ISO stamp are the calendar day. */
const PERIOD_LENGTH = 10;

/** One level of the document's layout indentation. */
const INDENT = '  ';

/**
 * The format this renderer serves, named once.
 *
 * Once rather than at each of the two places it is written into,
 * because two spellings of one literal is two things to keep in step
 * and the registry selects on this value.
 */
const FORMAT: ExportFormat = 'rss';

// ---------------------------------------------------------------------------
// The one route from a value to the document
// ---------------------------------------------------------------------------

/**
 * A value as it may appear in this document, text or attribute.
 *
 * Two passes, and neither is optional. What XML cannot carry is
 * REMOVED first — the format offers no escape for a C0 control or a
 * lone surrogate, so dropping is the only representation there is —
 * and the five predefined entities are then escaped in the order
 * {@link XML_PREDEFINED_ENTITIES} declares, ampersand first.
 *
 * One function and no second entry point, so nothing can escape
 * without stripping or strip without escaping. The header argues both
 * halves at length, including why 0x7f survives and why the quote and
 * the apostrophe are escaped where element content does not need it.
 *
 * Never throws. It takes text that is already text — the reduction of
 * an untrusted value happens before this, through
 * {@link sanitizeUntrusted}, which is where a value that refuses to
 * become a string ends a render.
 *
 * @param text - The value, already reduced if it was untrusted.
 * @returns The same characters, minus what XML cannot hold, with the
 * five predefined entities escaped.
 */
export function escapeXmlText(text: string): string {
  let escaped = text.replace(UNREPRESENTABLE_RE, '');

  for (const predefined of XML_PREDEFINED_ENTITIES) {
    escaped = escaped.split(predefined.character).join(predefined.entity);
  }

  return escaped;
}

/**
 * Untrusted text, neutralized and then escaped.
 *
 * The order is the argument the header makes: the reduction is what
 * makes the text a reader parses out of this document inert, and the
 * escape is what gets it through the parse unchanged. Escaping alone
 * would produce a well-formed document carrying live markup for the
 * reader that renders a description as HTML.
 *
 * @param text - The stored value.
 * @returns It, safe to place in the document.
 */
function reduced(text: string): string {
  return escapeXmlText(sanitizeUntrusted(text));
}

// ---------------------------------------------------------------------------
// Reading a stored column
// ---------------------------------------------------------------------------

/**
 * A stamp's timestamp, or `NaN` when there is nothing to read.
 *
 * The type says `Date` and a row read through the ORM supplies one,
 * but the type admits an INVALID date — `new Date` over text it
 * cannot parse is still a `Date` — and a caller may hand this
 * whatever it holds.
 *
 * @param value - The stamp, as the row carried it.
 * @returns Its timestamp, or `NaN`.
 */
function momentOf(value: Date): number {
  return value instanceof Date
    ? value.getTime()
    : Number.NaN;
}

/**
 * A stamp as RSS wants a date, or `null` when it cannot be read.
 *
 * `toUTCString` and never a local-time formatter: the language pins
 * its output to `Www, DD Mmm YYYY HH:mm:ss GMT` in English and in
 * UTC, so one stored row answers the same bytes on every machine —
 * and that shape is the RFC 822 date RSS asks for.
 *
 * THE GUARD IS WHY THIS IS NOT THE SIBLINGS' READING. `toISOString`
 * throws on an invalid date and is guarded so a render does not fail;
 * `toUTCString` does not throw, it answers the literal text
 * `Invalid Date`, which would be written into a `pubDate` element as
 * though it were a moment. The failure to guard against here is
 * silent bad data rather than an exception.
 *
 * @param value - The stamp, as the row carried it.
 * @returns The RFC 822 date, or `null` when there is none.
 */
function readRfc822(value: Date): string | null {
  return Number.isFinite(momentOf(value))
    ? value.toUTCString()
    : null;
}

/**
 * The calendar day a stamp fell on, or `null` when unreadable.
 *
 * Used for the file NAME and never for the document, which is why it
 * is a second reading of the same column rather than a slice of the
 * one above: RFC 822 leads with a weekday, and a name built from that
 * would sort by day-of-week.
 *
 * THE HONEST LIMIT IS THE COLUMN'S OWN. No column holds the span a
 * briefing covers, so what a renderer has is the moment it was
 * written plus the writer's convention that a briefing is generated
 * at the end of what it covers.
 *
 * @param value - The stamp, as the row carried it.
 * @returns The calendar day in UTC, or `null`.
 */
function readDay(value: Date): string | null {
  return Number.isFinite(momentOf(value))
    ? value.toISOString().slice(0, PERIOD_LENGTH)
    : null;
}

/**
 * A finding's score as the text to show, or `null` when it has none.
 *
 * NULL IS NOT ZERO. A measured zero prints as `0` and an unscored
 * finding prints nothing at all, which is the distinction
 * `ExportFindingRow.score` argues at its own column — a renderer that
 * showed an absence as a zero would claim the row was read and found
 * worthless. A value that is not finite reads as an absence, which is
 * the safe direction of the same law.
 *
 * @param score - The stored score.
 * @returns The score as text, or `null` when it was not measured.
 */
function readScore(score: number | null): string | null {
  return typeof score === 'number' && Number.isFinite(score)
    ? String(score)
    : null;
}

/**
 * A stored field value as the text a document shows, or `null` when
 * it is an absence rather than a value.
 *
 * `./markdown-body.ts`'s reading, written a second time DELIBERATELY.
 * Exporting that module's would make the markdown composer a
 * dependency of a renderer that composes no markdown, and the two
 * modules would then share a helper for a reason neither of them has.
 * What is NOT written twice is the marker: {@link UNREADABLE_MEMBER}
 * is imported, because a second spelling of the visible text is the
 * half a reader would meet, and `./rss.test.ts` drives the one shape
 * that reaches it through this module and through that one, holding
 * the marker both answered equal.
 *
 * The conversion is guarded because the value came out of a jsonb
 * column nothing validated on the way back out. Refusing there would
 * turn one hostile field into a failed render.
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

// ---------------------------------------------------------------------------
// Writing the document
// ---------------------------------------------------------------------------

/** The root element, which carries the version. */
const ROOT_ELEMENT_NAME = 'rss';

/** The one channel a document holds. */
const CHANNEL_ELEMENT_NAME = 'channel';

/** One entry in that channel, one per finding. */
const ITEM_ELEMENT_NAME = 'item';

/** The version attribute on the root element. */
const VERSION_ATTRIBUTE = 'version';

/**
 * Any element name this document writes for a value.
 *
 * The union of the two rosters, so a call site passing a literal is
 * checked against them: renaming a member of either list reddens
 * `check-types` at every writer that still names the old spelling.
 * That is the half `./rss.test.ts`'s roster guard cannot see, since a
 * suite reads what a document CONTAINS and not what a call site said.
 */
type RssElement = RssChannelElement | RssItemElement;

/**
 * One element, opened and closed on one line.
 *
 * The content is placed EXACTLY as given — no indentation is added
 * inside the tags, because indentation inside an element is part of
 * the text a reader shows. A multi-line value therefore runs flush
 * against the left margin from its second line on, which is the
 * header's point about layout stopping where content begins.
 *
 * @param name - Which element, from one of the two rosters.
 * @param content - The value, already escaped.
 * @param depth - How many levels of layout indentation precede it.
 * @returns The line, or lines, this element occupies.
 */
function element(
  name: RssElement,
  content: string,
  depth: number,
): string {
  return INDENT.repeat(depth) + '<' + name + '>' + content
    + '</' + name + '>';
}

/**
 * The item's identifier element, which is the one thing here that
 * carries an attribute.
 *
 * The attribute value goes through {@link escapeXmlText} exactly as
 * the content does, though it is a literal today: one escaper whose
 * answer is safe in both positions is what stops a value moved into
 * an attribute later from becoming an injection.
 *
 * @param findingId - The `findings.id` this item is of.
 * @param depth - How many levels of layout indentation precede it.
 * @returns The line.
 */
function guidElement(findingId: number, depth: number): string {
  const name: RssItemElement = 'guid';
  const attribute = GUID_PERMALINK_ATTRIBUTE + '="'
    + escapeXmlText(GUID_PERMALINK_VALUE) + '"';
  const named = escapeXmlText(ITEM_URN_PREFIX + String(findingId));

  return INDENT.repeat(depth) + '<' + name + ' ' + attribute + '>'
    + named + '</' + name + '>';
}

/**
 * An opening tag on its own line.
 *
 * @param name - The element being opened.
 * @param depth - How many levels of layout indentation precede it.
 * @returns The line.
 */
function openTag(name: string, depth: number): string {
  return INDENT.repeat(depth) + '<' + name + '>';
}

/**
 * A closing tag on its own line.
 *
 * @param name - The element being closed.
 * @param depth - How many levels of layout indentation precede it.
 * @returns The line.
 */
function closeTag(name: string, depth: number): string {
  return INDENT.repeat(depth) + '</' + name + '>';
}

/**
 * The root element's opening tag, carrying the version.
 *
 * Escaped like everything else, though both halves are literals here,
 * so that no value in the document reaches it by a route the escaper
 * does not cover.
 *
 * @returns The line.
 */
function rootOpenTag(): string {
  return '<' + ROOT_ELEMENT_NAME + ' ' + VERSION_ATTRIBUTE + '="'
    + escapeXmlText(RSS_VERSION) + '">';
}

/**
 * A finding's fields as the lines an item describes itself with.
 *
 * Sorted by key rather than left in the order the record happened to
 * carry them, which is the layout decision `./markdown-body.ts` makes
 * for the same reason: two rows of one domain written at different
 * times can hold the same keys in different orders, and a feed whose
 * items each lay their fields out differently is harder to read than
 * one that does not.
 *
 * A field whose stored value is an absence is left OUT rather than
 * written with nothing after the colon, which is the law the header
 * applies to a score and to a date.
 *
 * @param fields - The `findings.fields` record, unvalidated.
 * @returns One line per showable field, in sorted key order.
 */
function fieldLines(
  fields: Readonly<Record<string, unknown>>,
): readonly string[] {
  const lines: string[] = [];

  for (const key of Object.keys(fields).sort()) {
    const value = renderValue(fields[key]);

    if (value !== null) {
      lines.push(reduced(key) + FIELD_SEPARATOR + reduced(value));
    }
  }

  return lines;
}

/**
 * One item: a finding, laid out as the roster orders it.
 *
 * The title carries what the domain calls a finding, the row, and the
 * score when one was measured — the same shape and the same word
 * `./markdown-body.ts` writes into a bullet, so a reader with a note
 * and a feed open is looking at one number under one name.
 *
 * Two of the four elements drop out when the value behind them cannot
 * be read: a finding with no showable field describes itself with
 * nothing, and a `created_at` that is not a moment dates itself with
 * nothing. Neither is written blank.
 *
 * @param finding - The row this item is of.
 * @param displayName - What the domain calls a finding, already
 * reduced and escaped.
 * @param depth - How many levels of layout indentation precede the
 * item's own tags.
 * @returns The item's lines, its opening tag first.
 */
function itemLines(
  finding: ExportFindingRow,
  displayName: string,
  depth: number,
): readonly string[] {
  const inner = depth + 1;
  const score = readScore(finding.score);
  const scored = score === null
    ? ''
    : TITLE_SEPARATOR + '(' + SCORE_LABEL + TITLE_SEPARATOR
      + escapeXmlText(score) + ')';
  const titled = displayName + TITLE_SEPARATOR + String(finding.id)
    + scored;
  const lines = [
    openTag(ITEM_ELEMENT_NAME, depth),
    element('title', titled, inner),
    guidElement(finding.id, inner),
  ];
  const described = fieldLines(finding.fields);
  const stamp = readRfc822(finding.createdAt);

  if (described.length > 0) {
    const content = described.join(LINE_SEPARATOR);

    lines.push(element('description', content, inner));
  }

  if (stamp !== null) {
    lines.push(element('pubDate', escapeXmlText(stamp), inner));
  }

  lines.push(closeTag(ITEM_ELEMENT_NAME, depth));

  return lines;
}

/**
 * The channel's own elements, in the order the roster fixes.
 *
 * THE TITLE IS `domains.name` and not the slug, which is where this
 * renderer parts from `./notion-md.ts` — that module titles a page by
 * the slug because its preamble is unescaped by construction and free
 * text could not go there. Here everything goes through
 * {@link escapeXmlText}, so the operator-facing label is available
 * and is the better title: a feed reader shows it to a person.
 *
 * The link is a URN and names nothing dereferenceable; see the
 * header. The description is the briefing's prose, and it is OMITTED
 * rather than written empty when the column is NULL — the format
 * wants a description on a channel, and writing an empty one for a
 * pass whose drafting step answered nothing would undo the
 * distinction the nullable column exists to keep. A stored empty
 * string is a different matter and does write an empty element.
 *
 * @param input - The four stored rows this render is of.
 * @param slug - The domain slug, already reduced.
 * @param depth - How many levels of layout indentation precede them.
 * @returns The channel's lines, in document order.
 */
function channelLines(
  input: ExportRenderInput,
  slug: string,
  depth: number,
): readonly string[] {
  const { body, generatedAt } = input.briefing;
  const named = escapeXmlText(CHANNEL_URN_PREFIX + slug);
  const lines = [
    element('title', reduced(input.domain.name), depth),
    element('link', named, depth),
  ];
  const stamp = readRfc822(generatedAt);

  if (body !== null) {
    const prose = escapeXmlText(sanitizeUntrusted(body).trim());

    lines.push(element('description', prose, depth));
  }

  if (stamp !== null) {
    lines.push(element('pubDate', escapeXmlText(stamp), depth));
  }

  return lines;
}

/**
 * The whole document, line by line.
 *
 * One item per finding, in the order the caller selected them — which
 * is the order the digest assembly fixed, not one re-derived here. No
 * finding is dropped, merged or filed under a section.
 *
 * @param input - The four stored rows this render is of.
 * @param slug - The domain slug, already reduced.
 * @returns Every line of the feed, the declaration first.
 */
function documentLines(
  input: ExportRenderInput,
  slug: string,
): readonly string[] {
  const displayName = reduced(displayNameFor(input.domain.settings));
  const lines = [
    XML_DECLARATION,
    rootOpenTag(),
    openTag(CHANNEL_ELEMENT_NAME, 1),
    ...channelLines(input, slug, 2),
  ];

  for (const finding of input.findings) {
    lines.push(...itemLines(finding, displayName, 2));
  }

  lines.push(closeTag(CHANNEL_ELEMENT_NAME, 1));
  lines.push(closeTag(ROOT_ELEMENT_NAME, 0));

  return lines;
}

/**
 * The stem of the file name: the period and the briefing row.
 *
 * The row id is what supplies uniqueness, which the slugger says it
 * cannot: the reduction collapses rather than encodes, so two names
 * can answer one slug and only a stored id cannot. The period leads
 * because that is what a person scanning a folder is looking for, and
 * it drops out entirely when the stamp could not be read rather than
 * leaving a hyphen with nothing before it.
 *
 * @param day - The calendar day, or `null` when unreadable.
 * @param briefingId - The `briefings.id` this feed is of.
 * @returns The stem, before it is reduced.
 */
function feedStem(day: string | null, briefingId: number): string {
  const identifier = String(briefingId);

  return day === null
    ? identifier
    : day + NAME_SEPARATOR + identifier;
}

// ---------------------------------------------------------------------------
// The renderer
// ---------------------------------------------------------------------------

/**
 * Render one stored digest as one static RSS file.
 *
 * A channel from the domain and the briefing, one item per finding,
 * and nothing else. A period that held no findings is a feed with no
 * items rather than an absence, for the reason `./obsidian-md.ts`
 * argues: nothing downstream reads a destination back, so a missing
 * file and an export that never ran are the same thing to every
 * reader of one.
 *
 * Answers an empty list only when the path cannot be composed, which
 * `./artifact-path.ts` decides and this function does not second-
 * guess. Never throws for any stored row; the one ending a caller has
 * to be ready for is `sanitizeUntrusted`'s, over a value whose string
 * conversion throws.
 *
 * Pure, and static. No server is started, no endpoint is declared, no
 * request is made and nothing is written anywhere — the returned
 * artifact is the only way anything leaves this call, and what it
 * carries is a file.
 *
 * @param input - The four stored rows this render is of.
 * @returns One artifact, or none when the path was refused.
 */
export function renderRssFeed(input: ExportRenderInput): ExportArtifact[] {
  const slug = slugify(input.domain.slug);
  const day = readDay(input.briefing.generatedAt);
  const built = buildArtifactPath({
    folders: [slug],
    name: feedStem(day, input.briefing.id),
    extension: RSS_EXTENSION,
  });

  if (!built.ok) {
    return [];
  }

  const body = documentLines(input, slug).join(LINE_SEPARATOR);

  return [{
    format: FORMAT,
    path: built.path,
    mediaType: RSS_MEDIA_TYPE,
    body: body + LINE_SEPARATOR,
  }];
}

/**
 * The `rss` renderer, as the registry names it.
 *
 * The declaration shape `LISTING_API_DECLARATION` in
 * `src/sources/listing-api.ts` sets: the behaviour is an exported
 * function a case can call directly, and this const is the one member
 * a registry entry needs.
 */
export const RSS_RENDERER: ExportRenderer = {
  format: FORMAT,
  render: renderRssFeed,
};
