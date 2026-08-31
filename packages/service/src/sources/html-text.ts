/**
 * @packageDocumentation
 * html-text — markup reduced to the plain text a `documents.body`
 * holds, deterministically and with no model anywhere in it.
 *
 * NOT an adapter, which is the first thing to know about the file: it
 * fronts no source, opens no socket and appears in no registry.
 * `SourceAdapter` in `src/sources/index.ts` describes a module that
 * fetches, parses and canonicalizes ONE source; this is the text
 * reduction such modules reach for, because `documents.body` is plain
 * text by contract and several kinds of source answer with markup. It
 * sits beside the adapters rather than under `src/lib/` because it is
 * theirs — nothing else in the service reduces markup.
 *
 * That is a divergence from the shape the file was generated in, and
 * worth stating because the generator's contract is what a reader
 * will otherwise hold it to. `bun run scaffold source-adapter
 * html-text <dir>` emits three files: a module declaring all four
 * adapter members, a colocated case file, and a JSON payload envelope
 * for the stored-payload seam. The four members are gone, because the
 * original is three pure functions and not one of them does I/O, and
 * the payload envelope was never written, because a module with no
 * `fetch` has no stored payload for anything to be driven over. What
 * the generator's arrangement does give this port is the COLOCATED
 * case file, and that is kept: `src/sources/html-text.test.ts` sits
 * beside the module rather than under `tests/`, which is where every
 * ported `src/lib/` library's cases live instead.
 *
 * Nor is it in the roster `tests/build/lib-splice.test.ts` holds.
 * That roster and the marker loader in `scripts/build-workflows.ts`
 * both read `src/lib/`, and this file is not there. Nothing about it
 * would stop a splice — it imports nothing, keeps no state between
 * calls, and exports only declarations, which is the whole of the
 * dual-context rule — so what keeps it out is where it sits, and
 * nothing else. No marker reaches across that gap either:
 * `assertMarkerPath` in `scripts/workflow-markers.ts` refuses a path
 * holding a `..` segment, so no spelling of `__INLINE:` can name a
 * file under this directory at all. Registering it is therefore a
 * MOVE into `src/lib/`, owed by the phase that first needs this
 * reduction inside a Code node, and not a repair owed here.
 *
 * THE RULE the reduction holds: what a human reads is STRUCTURE, and
 * the structure survives. Paragraphs come back as blank-line
 * separated blocks and list items as lines opening with a dash. That
 * is not cosmetic. Every later deterministic pass in this platform
 * reads sentences, so a list flattened into one run-on line changes
 * which phrases sit in the same sentence as each other, and a pass
 * that scores a phrase in context would score a different document
 * than the one that was captured.
 *
 * The second half of the rule is that nothing here INVENTS. An entity
 * neither table knows is left exactly as it arrived, because a guess
 * about `&foo;` would be a guess written into a body; left alone it
 * is visible, and `documents.raw` still holds what the source said.
 *
 * The reduction never throws for text, and one of the three entry
 * points never throws at all. {@link htmlToText} and
 * {@link decodeHtmlEntities} each carry a catch answering `''`, so
 * malformed markup comes back as the best text available or as
 * nothing. {@link tidyText} carries none, which is the original's
 * asymmetry and is kept: a value whose string conversion refuses is
 * the one input that comes back as a throw, and it comes back that
 * way only through that one export.
 *
 * This is a PORT, and what it KEEPS is the whole of the behaviour:
 * both entity tables entry for entry, the case rule separating them,
 * the classification in {@link safeCodePoint}, every pattern
 * character for character, the order the passes run in, the tidy
 * chain and its order, which functions catch and which do not, and
 * the coercion in front of all three entry points.
 * `tests/parity/html-text.parity.test.ts` is what says so rather than
 * this paragraph — it drives all three exports and their originals
 * over one neutral corpus and fails on the first difference.
 *
 * What it DROPS is notation, and none of it is behaviour. The
 * CommonJS export block at the foot of the original becomes
 * declaration exports, which is what the splice strips and what a
 * Code node can run. `var` becomes `const` and `let`. The two-letter
 * prefix every declaration carried is gone — it stood in for a module
 * namespace the original had no other way to write, and a module has
 * one — so the internal tidy pass is simply {@link tidyText}, under
 * the name the original exported it as. `Object.prototype
 * .hasOwnProperty.call` becomes `Object.hasOwn`, the same test
 * written differently, which `newline-per-chained-call` wants at
 * three links anyway. And the four tag rosters and the two character
 * rosters become lists whose patterns are assembled from them, for
 * the reasons {@link DEAD_BLOCK_TAGS} and {@link anyOfCodes} carry.
 *
 * The last thing it leaves behind is subject matter rather than
 * code: the original names in its own header the two particular
 * services whose markup it was pointed at. Being able to read markup
 * is a property of the dialect and not of either of them, so the port
 * carries the reduction and not the thing it was aimed at.
 *
 * Four behaviours are preserved DELIBERATELY and are worth finding
 * here rather than in a debugger.
 *
 * The decode is ONE scan and never a loop. A source that serves its
 * markup entity-escaped is decoded once to recover the markup and
 * decoded again after the tags come off, so text that legitimately
 * contained a literal `&lt;` was written `&amp;lt;`, comes back as
 * `&lt;` from the first pass and as `<` from the second — as text,
 * never as a tag. A decoder that looped until nothing changed would
 * turn that literal into markup, which is markup an attacker chose.
 *
 * A dead block is removed WHOLE, its content included, and so is the
 * tail of the document when such a block is never closed. Stripping
 * the tags off a script element and keeping what was between them
 * would put its source into the body, where every later pass reads it
 * as prose somebody wrote.
 *
 * A list item opens a line and closes none. The next item's opening
 * tag already starts the following line, so closing one here as well
 * would put a blank line between every bullet and turn a six-item
 * list into twelve lines of alternating text and nothing.
 *
 * And {@link safeCodePoint} carries a catch around
 * {@link String.fromCodePoint} that cannot be reached: the range,
 * surrogate and control tests above it already exclude everything
 * that call refuses, and the pattern feeding it admits no value those
 * tests would let through. It is kept because this is a port and the
 * shape is the original's, and it is named here because a reader
 * measuring which branches the cases cover will otherwise go looking
 * for the input that reaches it.
 */

/**
 * One character, from the UTF-16 code unit that spells it.
 *
 * Aliased rather than called by its full name because the tables
 * below are read as tables: forty entries whose values are all one
 * call read as data, and the same forty spelled out read as code.
 * Source here stays ASCII, so a glyph is only ever written as the
 * number of the character it is — which also means the number and the
 * character cannot drift apart, as they would if a table wrote both.
 */
const charFrom = String.fromCharCode;

/** The non-breaking space, which two declarations below both need. */
const NBSP = charFrom(0x00a0);

/**
 * Named entities, matched EXACTLY.
 *
 * Named entities are case-sensitive in the markup dialect and it
 * matters: a decoder that lowercases its key silently turns one
 * letter into another, and the text this runs over includes names,
 * which are exactly the text where a substituted letter is both
 * invisible and wrong.
 *
 * The roster is the original's, entry for entry. It is not the
 * dialect's full set and was never meant to be — what is here is what
 * the reduction met, and an entity nobody has met is left verbatim
 * rather than guessed at.
 */
const HTML_NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'',
  nbsp: NBSP,
  ndash: charFrom(0x2013), mdash: charFrom(0x2014),
  hellip: charFrom(0x2026),
  lsquo: charFrom(0x2018), rsquo: charFrom(0x2019),
  sbquo: charFrom(0x201a),
  ldquo: charFrom(0x201c), rdquo: charFrom(0x201d),
  bdquo: charFrom(0x201e),
  laquo: charFrom(0x00ab), raquo: charFrom(0x00bb),
  bull: charFrom(0x2022), middot: charFrom(0x00b7),
  deg: charFrom(0x00b0), times: charFrom(0x00d7),
  copy: charFrom(0x00a9), reg: charFrom(0x00ae),
  trade: charFrom(0x2122),
  euro: charFrom(0x20ac), pound: charFrom(0x00a3),
  yen: charFrom(0x00a5), cent: charFrom(0x00a2),
  aring: charFrom(0x00e5), Aring: charFrom(0x00c5),
  auml: charFrom(0x00e4), Auml: charFrom(0x00c4),
  ouml: charFrom(0x00f6), Ouml: charFrom(0x00d6),
  aelig: charFrom(0x00e6), AElig: charFrom(0x00c6),
  oslash: charFrom(0x00f8), Oslash: charFrom(0x00d8),
  eacute: charFrom(0x00e9), Eacute: charFrom(0x00c9),
  uuml: charFrom(0x00fc), Uuml: charFrom(0x00dc),
  szlig: charFrom(0x00df),
};

/**
 * The handful whose spelling legitimately varies in case, and whose
 * meaning cannot vary with it.
 *
 * An uppercase spelling of each of these is valid in the current
 * dialect, and every one of them names punctuation rather than a
 * letter, so no case-folded lookup here can substitute one character
 * for another. Everything outside this set needs an exact match, for
 * the reason the table above carries.
 */
const HTML_CASELESS_ENTITIES: Readonly<Record<string, string>> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'', nbsp: NBSP,
};

/**
 * An entity reference: a numeric one in decimal or hex, or a name.
 *
 * The name alternative admits letters and digits only, capped at
 * thirty-two characters, which is what stops an unterminated `&` from
 * running away across a document looking for a semicolon. It also
 * means no name carrying an underscore is ever matched, so the two
 * prototype-shaped keys never reach a table lookup at all — the
 * own-property test in {@link entityFromTable} is what covers the
 * inherited names that CAN be spelled this way.
 *
 * The numeric alternative reads its digits out of the hex class in
 * BOTH bases, so a decimal reference carrying hex letters matches
 * here and is handed to a base-ten parse that stops at the first one.
 * A reference opening with a letter is unparseable and comes back
 * verbatim; one opening with a digit is read up to that letter and
 * the rest is dropped, so a decimal reference and the same reference
 * with a hex letter stuck on its end resolve identically. Both are
 * the original's readings, and the second is the one nobody expects.
 */
const ENTITY_RE = /&(#[xX]?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]{0,31});/g;

/**
 * Whitespace that is not a space but is read as one.
 *
 * Split from the roster below because the repair differs: a
 * non-breaking or thin space is a space a reader sees, so it becomes
 * one, while a zero-width joiner is nothing a reader sees at all and
 * becomes nothing.
 */
const SPACEY_CODES: readonly number[] = [
  0x00a0, 0x2007, 0x2009, 0x200a, 0x202f,
];

/**
 * Characters a reader cannot see, which are removed outright.
 *
 * A closed roster of five, and NOT a sweep of everything invisible —
 * the corpus in `tests/parity/fixtures.ts` knows seventeen such code
 * points, twelve of which come through this pass untouched. That is
 * the original's reading and is left alone; the general strip belongs
 * to the stage that prepares a chunk, not to a markup reduction.
 *
 * The same five are what {@link safeCodePoint} drops, so a document
 * carrying one of them arrives at the same body whether it was
 * written as a character or as an entity reference.
 */
const INVISIBLE_CODES: readonly number[] = [
  0x200b, 0x200c, 0x200d, 0x2060, 0xfeff,
];

/**
 * A pattern matching any ONE of a roster of characters.
 *
 * An alternation rather than a character class, which matches exactly
 * the same single characters and is what `no-misleading-character-
 * class` wants: a zero-width joiner sitting inside a class reads to
 * that rule as a joined sequence, and {@link INVISIBLE_CODES} carries
 * one. The original writes both rosters as classes, in a file no lint
 * rule reads.
 *
 * @param codes - The characters, as the code units that spell them.
 * @returns The pattern, global, for use through `replace`.
 */
function anyOfCodes(codes: readonly number[]): RegExp {
  const alternatives = codes.map((code) => charFrom(code));

  return new RegExp('(?:' + alternatives.join('|') + ')', 'g');
}

/** {@link SPACEY_CODES}, as the pass that reads them. */
const SPACEY_RE = anyOfCodes(SPACEY_CODES);

/** {@link INVISIBLE_CODES}, as the pass that reads them. */
const INVISIBLE_RE = anyOfCodes(INVISIBLE_CODES);

/** Both spellings of a line ending that is not a bare newline. */
const CRLF_RE = /\r\n/g;

/** A carriage return the pass above left standing on its own. */
const CR_RE = /\r/g;

/** A run of spaces or tabs, collapsed to one space. */
const HORIZONTAL_RUN_RE = /[ \t]+/g;

/** Trailing spaces in front of a line ending. */
const TRAILING_SPACE_RE = / *\n/g;

/** Three or more line endings, which is an artefact of the markup. */
const BLANK_RUN_RE = /\n{3,}/g;

/**
 * Elements whose CONTENT is not prose a reader was shown.
 *
 * The port writes the four tag rosters as lists and assembles their
 * patterns, where the original writes each as one alternation inside
 * a literal. Nothing about the patterns moves — the same four are
 * built character for character — and what it buys is that the
 * rosters can be READ against each other: three of the four differ
 * from a neighbour by one or two members, and that difference is
 * behaviour rather than an oversight. Precedent for the substitution
 * is `src/lib/parse-eml.ts`, which does the same to two charset
 * alternations for the same reason.
 */
const DEAD_BLOCK_TAGS: readonly string[] = [
  'script', 'style', 'head', 'noscript', 'iframe', 'svg', 'template',
];

/**
 * The two of those that also swallow the rest of a broken document.
 *
 * Narrower than the roster above on purpose. An unclosed heading or
 * template ends the document at whatever point it opened, which is a
 * document nobody can read; an unclosed script or style leaks source
 * into the body as prose, which is a document that reads as though
 * somebody wrote it.
 */
const DEAD_TAIL_TAGS: readonly string[] = ['script', 'style'];

/**
 * A block whose content is not prose, from its opening tag to the
 * matching close.
 *
 * Matched as a pair through a back-reference so a document holding
 * two of them does not have everything between the first opening tag
 * and the last closing one removed. Lazy, for the same reason.
 */
const DEAD_BLOCK_RE = new RegExp(
  '<(' + DEAD_BLOCK_TAGS.join('|') + ')\\b[^>]*>[\\s\\S]*?</\\1\\s*>',
  'gi',
);

/**
 * One of those two left UNCLOSED, and the rest of the document with
 * it.
 *
 * Deliberately not global: there is only one tail, and the first such
 * opening tag begins it.
 */
const DEAD_TAIL_RE = new RegExp(
  '<(' + DEAD_TAIL_TAGS.join('|') + ')\\b[^>]*>[\\s\\S]*$',
  'i',
);

/** A markup comment, including one carrying an angle bracket. */
const COMMENT_RE = /<!--[\s\S]*?-->/g;

/** A line break, in either of its spellings. */
const LINE_BREAK_RE = /<br\s*\/?>/gi;

/** A list item's opening tag. It closes nothing — see the header. */
const LIST_ITEM_RE = /<li\b[^>]*>/gi;

/**
 * Block elements whose CLOSING tag ends a line.
 *
 * `li` is deliberately absent — see the module header — and so is
 * `br`, which has no closing form worth matching. One member is a
 * character class rather than a name: the six heading levels, which
 * the original spells the same way.
 */
const BLOCK_CLOSE_TAGS: readonly string[] = [
  'p', 'div', 'ul', 'ol', 'tr', 'td', 'th', 'table', 'h[1-6]',
  'blockquote', 'section', 'article', 'header', 'footer', 'pre',
  'dl', 'dd', 'dt',
];

/**
 * Block elements whose OPENING tag starts one.
 *
 * Two members apart from the roster above, and both differences are
 * the original's. The table cells are missing here, so a row of cells
 * reads as one line rather than one line per cell. And `hr` is here
 * and in no closing roster at all, being a break rather than a
 * container.
 */
const BLOCK_OPEN_TAGS: readonly string[] = [
  'p', 'div', 'ul', 'ol', 'tr', 'table', 'h[1-6]', 'blockquote',
  'section', 'article', 'header', 'footer', 'pre', 'hr', 'dl',
  'dd', 'dt',
];

/** The closing tag of a block element. */
const BLOCK_CLOSE_RE = new RegExp(
  '</(' + BLOCK_CLOSE_TAGS.join('|') + ')\\s*>',
  'gi',
);

/** The opening tag of a block element, attributes and all. */
const BLOCK_OPEN_RE = new RegExp(
  '<(' + BLOCK_OPEN_TAGS.join('|') + ')\\b[^>]*>',
  'gi',
);

/**
 * Any remaining tag, opening or closing.
 *
 * A letter is required immediately after the bracket, which is what
 * lets a comparison written in prose survive: a bare `<` followed by
 * a digit or a space carries no letter there and is left alone.
 */
const ANY_TAG_RE = /<\/?[a-zA-Z][^>]*>/g;

/** A declaration or processing instruction, which carries no prose. */
const BANG_TAG_RE = /<![^>]*>/g;

/** The lowest code point a document may carry as ordinary text. */
const FIRST_PRINTABLE = 0x20;

/** The highest code point there is. */
const LAST_CODE_POINT = 0x10ffff;

/**
 * Whatever a caller passed, as text.
 *
 * Takes `unknown` on purpose. The exports here are reached from
 * adapters reading fields out of a payload nobody typed, so this
 * guard is all that stands between an absent field and a crash inside
 * a `replace` — and typing the parameter as `string` would let the
 * compiler delete the reasoning while the runtime still needed it.
 *
 * Absence answers `''`, and everything else answers its own string
 * conversion. That includes values whose conversion THROWS: the two
 * entry points that catch turn such a value into `''`, and
 * {@link tidyText}, which does not catch, lets it out.
 *
 * @param value - Anything at all, including nothing.
 * @returns The text to reduce.
 */
function asText(value: unknown): string {
  return value === null || value === undefined
    ? ''
    : String(value);
}

/**
 * What a decoded code point becomes, if it becomes anything.
 *
 * Three answers, and the difference between the first two is the
 * whole of this function. `null` means the reference was not a code
 * point at all — unparseable, negative, past the last one — and the
 * caller leaves the entity VERBATIM, because there is nothing to put
 * in its place. `''` means it was a perfectly well-formed reference
 * to a character a body must not carry, and the caller DROPS it.
 * Anything else is the character.
 *
 * A reference to NUL is the second kind rather than the first, and it
 * is the example worth holding onto: `&#0;` parses, is in range, and
 * is a control character, so it is dropped rather than left standing
 * as text. So are the C0 and C1 ranges around it, the lone
 * surrogates, and the five characters a reader cannot see. Tab and
 * newline are the exceptions, because in text they are structure.
 *
 * Dropping rather than passing through is the point of the pass: a
 * stored body is what a reader reads, and a smuggled zero-width
 * character in it is a difference between two documents that no
 * reader and no reviewer can see.
 *
 * The catch around {@link String.fromCodePoint} cannot be reached —
 * every value that call refuses is excluded by a test above it — and
 * is kept because the shape is the original's. See the module header.
 *
 * @param code - The number the reference spelled, which may be `NaN`.
 * @returns The character, `''` to drop it, or `null` to keep the
 * entity as written.
 */
function safeCodePoint(code: number): string | null {
  if (!Number.isFinite(code) || code < 0 || code > LAST_CODE_POINT) {
    return null;
  }

  // Tab and newline are structure, and the only two control
  // characters a reduced body is allowed to hold.
  if (code === 9 || code === 10) {
    return charFrom(code);
  }

  // The C0 range below the printable characters, and the C1 range
  // that follows the delete character.
  if (code < FIRST_PRINTABLE || (code >= 0x7f && code <= 0x9f)) {
    return '';
  }

  // A surrogate on its own is half of a character.
  if (code >= 0xd800 && code <= 0xdfff) {
    return '';
  }

  // Zero-width space, non-joiner and joiner.
  if (code === 0x200b || code === 0x200c || code === 0x200d) {
    return '';
  }

  // Word joiner, and the byte order mark in its zero-width use.
  if (code === 0x2060 || code === 0xfeff) {
    return '';
  }

  try {
    return String.fromCodePoint(code);
  } catch {
    return null;
  }
}

/**
 * One entity's replacement, by OWN property only.
 *
 * The own-property test is load-bearing rather than defensive. Both
 * tables are ordinary objects, so a plain lookup answers for every
 * name their prototype carries — `&constructor;` and `&toString;` are
 * both spellable by {@link ENTITY_RE} — and a function coerced into a
 * document would put its own source into the body.
 *
 * @param table - The table to read.
 * @param name - The entity name, exactly as the reference spelled it.
 * @returns The replacement, or nothing when the table has no such
 * entry of its own.
 */
function entityFromTable(
  table: Readonly<Record<string, string>>,
  name: string,
): string | undefined {
  return Object.hasOwn(table, name)
    ? table[name]
    : undefined;
}

/**
 * One entity reference, resolved.
 *
 * Numeric references go through {@link safeCodePoint}; named ones are
 * looked up exactly first, then case-folded against the short table
 * that permits it. A name neither table knows comes back as the
 * reference itself, unchanged.
 *
 * @param whole - The reference as written, including its delimiters.
 * @param body - What sat between them.
 * @returns What the reference becomes, which may be itself.
 */
function resolveEntity(whole: string, body: string): string {
  if (body.charAt(0) === '#') {
    const isHex = body.charAt(1) === 'x' || body.charAt(1) === 'X';
    const code = isHex
      ? parseInt(body.slice(2), 16)
      : parseInt(body.slice(1), 10);
    const glyph = safeCodePoint(code);

    return glyph === null
      ? whole
      : glyph;
  }

  const exact = entityFromTable(HTML_NAMED_ENTITIES, body);

  if (exact !== undefined) {
    return exact;
  }

  const folded = entityFromTable(HTML_CASELESS_ENTITIES, body.toLowerCase());

  return folded === undefined
    ? whole
    : folded;
}

/**
 * Resolve every entity reference in a text, in ONE scan.
 *
 * One scan is the whole point rather than an optimization — see the
 * module header for what a second pass would do to text that was
 * escaped twice on purpose.
 *
 * A reference this does not know is left exactly as it arrived. That
 * covers a name outside both tables, a numeric reference to nothing,
 * and an `&` that no semicolon ever closes; each stays visible, and
 * the payload the document came out of still holds the original.
 *
 * Never throws. A value that refuses to become text is caught and
 * answers `''`, which is the original's reading.
 *
 * @param text - The text to decode. Anything that is not a string is
 * read through {@link asText} first — the guard exists because these
 * exports are handed fields out of payloads nobody typed.
 * @returns The same text with its references resolved.
 */
export function decodeHtmlEntities(text: string): string {
  try {
    const s = asText(text);

    // Nothing to scan for, and the common case by a distance: most
    // documents carry no reference at all.
    if (!s.includes('&')) {
      return s;
    }

    return s.replace(ENTITY_RE, resolveEntity);
  } catch {
    return '';
  }
}

/**
 * Tidy text into the shape a stored body holds.
 *
 * Line endings are normalized, the spaces that are not spaces become
 * spaces, the characters that are nothing are removed, horizontal
 * runs collapse, trailing spaces go, and a run of blank lines becomes
 * ONE blank line. Blank lines are structure worth keeping; a dozen of
 * them are an artefact of whatever produced the markup.
 *
 * Exported rather than kept private because a source that publishes
 * its own PLAIN text still needs it: such a payload arrives with its
 * own spacing, and nothing else in the capture path collapses a run
 * of blank lines.
 *
 * The one entry point here with NO catch, which is deliberate and is
 * the original's asymmetry: a value whose string conversion refuses
 * comes back as a throw from this export and as `''` from the other
 * two. See the module header.
 *
 * @param text - The text to tidy. Anything that is not a string is
 * read through {@link asText} first.
 * @returns The tidied text, trimmed at both ends.
 * @throws Error Whatever a hostile string conversion raised, since
 * nothing here catches it.
 */
export function tidyText(text: string): string {
  return asText(text)
    .replace(CRLF_RE, '\n')
    .replace(CR_RE, '\n')
    .replace(SPACEY_RE, ' ')
    .replace(INVISIBLE_RE, '')
    .replace(HORIZONTAL_RUN_RE, ' ')
    .replace(TRAILING_SPACE_RE, '\n')
    .replace(BLANK_RUN_RE, '\n\n')
    .trim();
}

/**
 * Reduce markup to the plain text a `documents.body` holds.
 *
 * The passes run in a fixed order and the order is the design.
 * Comments go first, so an angle bracket hiding inside one never
 * reaches a tag pattern. Dead blocks go next, WHOLE, followed by the
 * unclosed tail one of them may have left. Then the tags that mean a
 * line — a break, a list item, a block closing, a block opening —
 * each becoming the line ending it stands for. Then every remaining
 * tag is removed, attributes and all, which is where a link hidden in
 * an attribute stops existing. Entities are resolved LAST, after the
 * markup is gone, so a decoded angle bracket arrives as text and can
 * no longer be read as a tag.
 *
 * Text carrying no angle bracket at all skips the whole of that and
 * is decoded and tidied directly, which is both faster and the
 * original's reading.
 *
 * Never throws: malformed markup comes back as the best text
 * available, or as `''`.
 *
 * @param html - The markup. Anything that is not a string is read
 * through {@link asText} first.
 * @returns Plain text, with the structure a reader reads preserved.
 */
export function htmlToText(html: string): string {
  try {
    let s = asText(html);

    if (!s) {
      return '';
    }

    // No tag anywhere, so there is nothing for the passes below to
    // find. Entities can still be here, and still have to go.
    if (!s.includes('<')) {
      return tidyText(decodeHtmlEntities(s));
    }

    s = s.replace(COMMENT_RE, ' ');
    s = s.replace(DEAD_BLOCK_RE, '\n');
    s = s.replace(DEAD_TAIL_RE, '\n');
    s = s.replace(LINE_BREAK_RE, '\n');
    s = s.replace(LIST_ITEM_RE, '\n- ');
    s = s.replace(BLOCK_CLOSE_RE, '\n');
    s = s.replace(BLOCK_OPEN_RE, '\n');
    s = s.replace(ANY_TAG_RE, '');
    s = s.replace(BANG_TAG_RE, '');

    return tidyText(decodeHtmlEntities(s));
  } catch {
    return '';
  }
}
