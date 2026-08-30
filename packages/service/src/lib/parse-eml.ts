/**
 * @packageDocumentation
 * parse-eml — a small MIME reader: a header block, a boundary walk,
 * the two transfer encodings that carry text, and the charset step
 * that turns bytes back into characters.
 *
 * WHY THIS LANDS WHEN THE THING THAT CALLED IT DOES NOT. The origin
 * pointed this reader at a mailbox, and the mailbox is on the port's
 * drop list — there is no IMAP connection here, no polling, and no
 * per-sender parser. But what that list drops is the INTAKE, and an
 * intake and a format reader are different things: the connection
 * that fed this one is gone, the format it read is not. A message is
 * a file somebody can hand a capture endpoint; `multipart/` is the
 * shape of an HTTP body as much as of a mailbox item; and RFC 2047
 * encoded words turn up wherever a header had to carry a character
 * ASCII has no room for. So the reader ports and the mailbox does
 * not, which is the same split `parse-csv.ts` describes one file
 * over — the mechanism arrives now, and the callers that point it at
 * something arrive with the later phases.
 *
 * The second reason is the one that would be expensive to rediscover.
 * This is the only module in this directory that works in BYTES, and
 * the discipline it holds is not obvious enough to re-derive from a
 * blank file:
 *
 * ```text
 * input (Buffer or string)
 *   -> one latin1 string, where every char is exactly one byte
 *   -> structural work: line folding, ':' splits, '--boundary' cuts
 *   -> Buffer.from(part, 'latin1') recovers that part's exact bytes
 *   -> transfer decode (base64 / quoted-printable) to BYTES
 *   -> charset decode, once, per the part's own declaration
 * ```
 *
 * Neither obvious route works. A whole-input `toString('utf8')`
 * mangles every part whose charset disagrees with the one it picked,
 * and working in UTF-8 strings loses a lone `0xE9` to a replacement
 * character before the part that knew how to read it is reached. The
 * latin1 fold avoids both: it is exact in each direction, since
 * `Buffer.from(s, 'latin1')` keeps each char's low eight bits and
 * `buffer.toString('latin1')` maps each byte to one char, and every
 * delimiter split on here is ASCII — so the structure stays legible
 * while the 8-bit bytes ride along as chars 128 through 255.
 *
 * IT NEVER THROWS, which puts it on `parse-csv.ts`'s side of this
 * directory rather than `yaml-lite.ts`'s. A hand-edited configuration
 * is somebody's typo and that person is standing there to be told; a
 * message arrived from outside, and a reader that refused one would
 * discard the parts it had already understood along with the part it
 * had not. So malformed input is REPORTED instead: every fault
 * appends a sentence to `parse_warnings`, the key is absent when
 * there were none, and the caller gets whatever could be read beside
 * the list of what could not. The nine sentences are the contract as
 * much as the return value is, which is why the fixed ones are
 * collected into {@link WARNED} where they can be checked against the
 * original in one place.
 *
 * The subset is deliberately narrow, and a reader is better off
 * knowing where its edges are than discovering them:
 *
 * - Headers unfold across continuation lines, and the FIRST
 *   occurrence of a name wins.
 * - Encoded words decode for both B and Q; adjacent ones separated
 *   only by whitespace are merged, since that whitespace is not text.
 * - Multipart containers nest ONE level. A third level is skipped
 *   with a warning rather than walked.
 * - `text/plain` and any other `text/` type accumulate into `text`,
 *   `text/html` into `html`, and anything else is ignored with a
 *   warning naming its type.
 * - Charsets are read for UTF-8, US-ASCII and ISO-8859-1. Anything
 *   else is decoded as UTF-8 with a warning, which is a best effort
 *   and says so.
 *
 * This is a PORT, and what it KEEPS is the whole of the behaviour:
 * the byte path above, every warning sentence, the header unfolding
 * and first-wins rule, the boundary split and its closing-delimiter
 * check, the depth bound, the quoted-printable escape rules including
 * what becomes of an escape that is not one, and the accumulation
 * order that decides which part's text comes first.
 * `tests/parity/parse-eml.parity.test.ts` is what says so rather than
 * this paragraph — it drives both implementations over one neutral
 * corpus and fails on the first difference.
 *
 * What it DROPS is four things, none of them behaviour. The CommonJS
 * export block at the foot of the original becomes declaration
 * exports, which is what the splice strips and what a Code node can
 * run. `var` becomes `const` and `let`. A handful of expressions are
 * restated in the equivalent modern form — bracket reads become
 * {@link String.charAt} so `noUncheckedIndexedAccess` has nothing to
 * complain about, `substr(i, 2)` becomes the `slice` over the same
 * span, prefix tests become {@link String.startsWith}, the two
 * charset alternation chains become named lists, and
 * `Object.prototype.hasOwnProperty.call` becomes `Object.hasOwn` —
 * each of them the same test written differently. And several method
 * chains are split across bound intermediates, because
 * `newline-per-chained-call` is an error here at three links.
 *
 * The fifth thing it leaves behind is subject matter rather than
 * code: the original names in its own header what kind of mail it was
 * enough for, and this reader is pointed at no correspondent at all.
 *
 * One behaviour is preserved DELIBERATELY, and it is the kind nobody
 * goes looking for: a header line named `__proto__` is silently
 * dropped. {@link parseHeaderBlock} assigns into a plain object, so
 * the assignment goes through the prototype setter instead of
 * creating a key, and `Object.hasOwn` stays false afterwards, so a
 * second one is not caught as a duplicate either. Same shape
 * `parse-csv.ts` carries for a header CELL, same one-line fix
 * (`Object.create(null)`).
 *
 * Where it PARTS from the sibling decides what can honestly be
 * written about it. There the drop is visible in the answer — a
 * column named `__proto__` is missing from every row. Here it is
 * visible nowhere today: {@link parseEml} lifts five header names and
 * reads two more, `__proto__` is none of the seven, so a message
 * carrying it parses exactly as the same message without it and a
 * null-prototype object would change no output the parity suite or
 * any case here could see. Measured, not assumed. So what follows is
 * a RECORD rather than a pin, and the record is the point: the day
 * something exports the header map or reads a sixth name out of it,
 * the drop stops being invisible, and by then the assignment causing
 * it is four functions away from whatever noticed.
 *
 * The dual-context rules hold by construction: this file imports
 * nothing, keeps no state between calls, and reaches only for
 * `Buffer`, which a Code node has. That same rule is why the file is
 * long rather than split — a second module would need the import the
 * rule forbids, so `many small files` has no expression in this
 * directory and the whole reader lives in one place.
 * `tests/build/lib-splice.test.ts` registers it and reads what a real
 * build made of it.
 */

/**
 * The five header fields this reader lifts out, decoded.
 *
 * Every one is a string and never `null`: a header the message did
 * not carry reads `''`, which is the same answer as a header it
 * carried empty. A caller that needs to tell those apart is asking a
 * question this subset does not answer.
 */
export interface EmlHeaders {
  /** The `From` header, encoded words decoded. */
  readonly from: string;

  /** The `To` header, unfolded across its continuation lines. */
  readonly to: string;

  /** The `Subject` header, encoded words decoded. */
  readonly subject: string;

  /** The `Date` header, exactly as the message wrote it. */
  readonly date: string;

  /** The `Reply-To` header, under the name a caller reads it by. */
  readonly replyTo: string;
}

/**
 * One message, read as far as it could be read.
 *
 * `text` and `html` are accumulators rather than single parts: a
 * message carrying two plain parts answers with both, joined in the
 * order the walk reached them.
 */
export interface EmlMessage {
  /** The five headers, decoded. */
  readonly headers: EmlHeaders;

  /** Every `text/` part that was not HTML, joined. */
  readonly text: string;

  /** Every `text/html` part, joined. */
  readonly html: string;

  /**
   * What went wrong, in the order it was found.
   *
   * Absent rather than empty when nothing did — the key's PRESENCE is
   * the signal, and a caller that spreads this object into a row
   * writes a column only for a message that had something to report.
   * The name is snake_case because it is a wire key rather than a
   * local: it crosses into a Code node's output and into stored JSON,
   * where renaming it would be a schema change wearing a style fix.
   */
  readonly parse_warnings?: readonly string[];
}

/** A part split into what described it and what it held. */
interface HeaderSplit {
  /** Lowercased header names to their unfolded values. */
  readonly headers: Record<string, string>;

  /** Everything under the blank line, undecoded. */
  readonly body: string;
}

/**
 * The two accumulators a walk fills, before either becomes a string.
 *
 * `null` and `''` mean different things here and the distinction is
 * load-bearing on the way through: `null` is a part that was never
 * seen, `''` is one that was seen and held nothing. Only the second
 * may be joined onto. Both collapse to `''` on the way out, which is
 * where the distinction stops mattering.
 */
interface PartAccumulator {
  /** Every `text/` part so far, or `null` for none yet. */
  text: string | null;

  /** Every `text/html` part so far, or `null` for none yet. */
  html: string | null;
}

/**
 * Every warning that is one fixed sentence, collected.
 *
 * These sentences ARE the contract a port preserves — a caller
 * reading `parse_warnings` is reading them — so they are worth
 * checking against the original in one place rather than at four call
 * sites. The four warnings naming a charset, a boundary, an encoding
 * or a part type stay where the value they interpolate is.
 */
const WARNED = {
  coercedInput: 'input was not a string or Buffer; coerced',
  deepMultipart: 'multipart nested deeper than one level; skipped',
  noBoundary: 'multipart part has no boundary; skipped',
  noSeparator: 'no header/body separator found',
};

/**
 * How deep a multipart container may nest before a walk stops.
 *
 * One level: a container inside a container is walked, and a third is
 * warned about and skipped. The bound is here rather than left to the
 * recursion because a message is untrusted input and its nesting is
 * the cheapest thing in it to make unbounded.
 */
const MAX_MULTIPART_DEPTH = 1;

/** The blank line that ends a header block and opens a body. */
const HEADER_SEPARATOR = '\n\n';

/**
 * The plain-text type, which is also what a part carrying no
 * `Content-Type` header at all is read as.
 *
 * One constant for both roles because it is one string in the wire
 * format: MIME's default for a part that declares nothing IS
 * `text/plain`, so a second name would suggest a distinction the
 * format does not make.
 */
const DEFAULT_CONTENT_TYPE = 'text/plain';

/** The prefix a container type opens with. */
const MULTIPART_PREFIX = 'multipart/';

/** The prefix every type this reader accumulates opens with. */
const TEXT_PREFIX = 'text/';

/** The type whose parts go to `html` rather than to `text`. */
const HTML_TYPE = 'text/html';

/** The two extra dashes a closing boundary delimiter carries. */
const CLOSING_MARK = '--';

/**
 * Charset labels read as UTF-8, the empty label among them.
 *
 * Empty because a part declaring no charset is not a part in an
 * unknown one — MIME's default is US-ASCII, which UTF-8 is a superset
 * of, so decoding it as UTF-8 is right rather than merely convenient.
 */
const UTF8_CHARSETS: readonly string[] = [
  '', 'utf-8', 'utf8', 'us-ascii', 'ascii',
];

/** Charset labels read as latin1: one byte in, one char out. */
const LATIN1_CHARSETS: readonly string[] = [
  'iso-8859-1', 'latin1', 'iso8859-1', 'iso_8859-1',
];

/**
 * Transfer encodings meaning the body already IS its own bytes.
 *
 * The empty label is a member for the same reason it is a member of
 * the charset list: a part declaring nothing is not a part declaring
 * something unknown, and only the second is worth a warning.
 */
const IDENTITY_ENCODINGS: readonly string[] = [
  '', '7bit', '8bit', 'binary',
];

/** The transfer encoding whose payload is base64. */
const BASE64_ENCODING = 'base64';

/** The transfer encoding this file decodes byte by byte. */
const QUOTED_PRINTABLE_ENCODING = 'quoted-printable';

/** Byte value of `=`, kept when an escape turns out not to be one. */
const EQUALS_BYTE = 0x3d;

/** Byte value of a space, which Q-encoding writes as `_`. */
const SPACE_BYTE = 0x20;

/** Mask keeping a latin1 char's low eight bits, which are its byte. */
const BYTE_MASK = 0xff;

/** Radix the two hex digits of an escape are read in. */
const HEX_RADIX = 16;

/** How many characters an escape takes: the `=` and two digits. */
const ESCAPE_LENGTH = 3;

/** How many a soft break takes when the line ended with one feed. */
const SOFT_BREAK_LENGTH = 2;

/** How many it takes when the line ended with a pair. */
const CRLF_SOFT_BREAK_LENGTH = 3;

/** A CRLF pair, folded to one line feed before anything is split. */
const CRLF = /\r\n/g;

/** A lone carriage return, folded the same way. */
const LONE_CR = /\r/g;

/** A folded header line: a break followed by space or tab. */
const HEADER_CONTINUATION = /\n[ \t]+/g;

/** Whitespace inside a base64 payload, dropped before decoding. */
const BASE64_WHITESPACE = /\s+/g;

/** The two hex digits an escape needs before it is one. */
const ESCAPE_HEX = /^[0-9A-Fa-f]{2}$/;

/** The gap between two encoded words, which is not part of the text. */
const ENCODED_WORD_GAP = /\?=[ \t]+=\?/g;

/** One RFC 2047 encoded word: charset, encoding, payload. */
const ENCODED_WORD = /=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g;

/** The rest of the line a boundary delimiter opens. */
const BOUNDARY_LINE_TAIL = /^[^\n]*\n/;

/** The line feed belonging to the next boundary, not to this part. */
const TRAILING_LINE_FEED = /\n$/;

/** The headers a message that could not be read at all answers with. */
const EMPTY_HEADERS: EmlHeaders = {
  from: '',
  to: '',
  subject: '',
  date: '',
  replyTo: '',
};

/**
 * Whatever a caller passed, as text.
 *
 * Takes `unknown` on purpose. The spliced copy runs in a Code node
 * where no type was ever checked, so this guard is all that stands
 * between a node handing this an absent field and a crash inside a
 * string method — and typing the parameter as `string` would let the
 * compiler delete the reasoning while the runtime still needed it.
 *
 * @param value - Anything at all, including nothing.
 * @returns The text, with absence reading as `''`.
 */
function asText(value: unknown): string {
  return value === null || value === undefined
    ? ''
    : String(value);
}

/**
 * Fold arbitrary input to a string where one char is one byte.
 *
 * A `Buffer` maps straight across: latin1 has a character for every
 * one of the 256 byte values, so nothing is lost and nothing is
 * merged. A string is encoded as UTF-8 FIRST and read back as latin1,
 * which sounds like a detour and is the only correct route — a JS
 * string is characters, the rest of this file works in bytes, and the
 * encode is what decides which bytes those characters are. Skipping
 * it would leave a character above U+00FF unrepresentable in a
 * one-byte-per-char world.
 *
 * Anything else is coerced with a warning, because a node that read a
 * file into a value the platform did not model would otherwise get an
 * empty message and no sign that anything went wrong.
 *
 * @param raw - A `Buffer`, a string, or something that is neither.
 * @param warnings - Collector this appends a coercion note to.
 * @returns The input as one latin1 char per source byte.
 */
function toByteString(raw: unknown, warnings: string[]): string {
  if (Buffer.isBuffer(raw)) {
    return raw.toString('latin1');
  }

  if (typeof raw === 'string') {
    return Buffer.from(raw, 'utf8').toString('latin1');
  }

  warnings.push(WARNED.coercedInput);

  return Buffer.from(asText(raw), 'utf8').toString('latin1');
}

/**
 * Read decoded bytes as characters, per the charset a part declared.
 *
 * This is the LAST step, and it has to be: a transfer decoding
 * answers bytes, and only the part itself knows what those bytes
 * spell. Running it earlier — or once over the whole message — is the
 * mistake the latin1 fold exists to make impossible.
 *
 * An unsupported label is decoded as UTF-8 and warned about rather
 * than refused, which is a best effort and says so in the warning.
 * The alternative is dropping a part whose bytes are probably legible
 * and certainly present.
 *
 * @param bytes - The part's bytes, already transfer-decoded.
 * @param charset - The label the part declared, or `null` for none.
 * @param warnings - Collector an unsupported label is reported to.
 * @returns The bytes as text.
 */
function decodeCharset(
  bytes: Buffer,
  charset: string | null,
  warnings: string[],
): string {
  const label = asText(charset).trim();
  const normalized = label.toLowerCase();

  if (UTF8_CHARSETS.includes(normalized)) {
    return bytes.toString('utf8');
  }

  if (LATIN1_CHARSETS.includes(normalized)) {
    return bytes.toString('latin1');
  }

  warnings.push(`unsupported charset "${charset}"; decoded as utf-8`);

  return bytes.toString('utf8');
}

/**
 * Decode quoted-printable to BYTES, never to a string.
 *
 * The return type is the whole point. Building text here would pick a
 * charset before the part had declared one, which is exactly the
 * fidelity loss this module is arranged to avoid: `=E9` is one byte,
 * and whether that byte is `é` or half of something else is
 * {@link decodeCharset}'s question and not this one's.
 *
 * Two dialects, one routine, and the flag is what separates them. In
 * a body, `=` at the end of a line is a soft break that came from a
 * line-length limit and is removed with the break. In the Q-encoding
 * of a header there are no line breaks to soften, and `_` is a space.
 *
 * An `=` that opens neither an escape nor a soft break stays as a
 * literal `=`. That is the origin's reading and it is the right one
 * for this library: a message written by hand is full of equals
 * signs, and refusing one would lose a part over punctuation.
 *
 * @param input - The payload, one latin1 char per byte.
 * @param qEncoding - Whether this is a header word rather than a body.
 * @returns The bytes the payload spelled.
 */
function decodeQuotedPrintable(input: string, qEncoding: boolean): Buffer {
  const bytes: number[] = [];
  let index = 0;

  while (index < input.length) {
    const char = input.charAt(index);

    if (char === '=') {
      const next = input.charAt(index + 1);

      if (!qEncoding && next === '\n') {
        index += SOFT_BREAK_LENGTH;
        continue;
      }

      if (!qEncoding && next === '\r') {
        index += input.charAt(index + 2) === '\n'
          ? CRLF_SOFT_BREAK_LENGTH
          : SOFT_BREAK_LENGTH;
        continue;
      }

      const hex = input.slice(index + 1, index + ESCAPE_LENGTH);

      if (ESCAPE_HEX.test(hex)) {
        bytes.push(parseInt(hex, HEX_RADIX));
        index += ESCAPE_LENGTH;
        continue;
      }

      bytes.push(EQUALS_BYTE);
      index += 1;
      continue;
    }

    if (qEncoding && char === '_') {
      bytes.push(SPACE_BYTE);
      index += 1;
      continue;
    }

    bytes.push(char.charCodeAt(0) & BYTE_MASK);
    index += 1;
  }

  return Buffer.from(bytes);
}

/**
 * Decode the RFC 2047 encoded words in one header value.
 *
 * Adjacent words separated only by whitespace are merged before
 * anything is decoded, and that step is not cosmetic: the whitespace
 * between two encoded words is a wrapping artefact rather than text,
 * so a subject split across two words rejoins with no gap where a
 * naive pass would leave one.
 *
 * A word this reader does not recognise is left exactly as it was
 * written, which is ugly and honest: the raw encoded word says the
 * header carried something unreadable, where an empty string would
 * say the header was empty. In practice that is the word whose
 * encoding letter is neither B nor Q — the pattern never matches it,
 * so nothing touches it.
 *
 * The `catch` is the origin's belt and braces rather than a path with
 * a case behind it. Measured, none of the three calls inside it
 * throws: a base64 decode is LENIENT, so a payload that is not base64
 * comes back as whatever bytes it could make rather than as a
 * refusal, and neither the quoted-printable pass nor the charset step
 * has a throwing branch at all. It is kept because preserving
 * behaviour is the rule in this directory, and named here so the next
 * reader does not go looking for the input that reaches it.
 *
 * The charset step here is handed a throwaway collector rather than
 * the message's. A header naming an unsupported charset is not a
 * fault of the message body, and a warning about it would arrive on
 * the same list as a truncated multipart with the same weight.
 *
 * @param value - One header value, unfolded.
 * @returns The value with every word this reader understands decoded.
 */
function decodeEncodedWords(value: string): string {
  const merged = asText(value).replace(ENCODED_WORD_GAP, '?==?');

  return merged.replace(
    ENCODED_WORD,
    (whole: string, charset: string, enc: string, text: string) => {
      try {
        const bytes = enc === 'B' || enc === 'b'
          ? Buffer.from(text.replace(BASE64_WHITESPACE, ''), 'base64')
          : decodeQuotedPrintable(text, true);

        return decodeCharset(bytes, charset, []);
      } catch {
        return whole;
      }
    },
  );
}

/**
 * The bare type out of a `Content-Type` header, lowercased.
 *
 * Everything from the first semicolon on is parameters, and the type
 * is what decides which branch a part takes.
 *
 * @param contentType - The header value, parameters and all.
 * @returns The type alone, or `''` when the header held none.
 */
function ctType(contentType: string): string {
  const head = asText(contentType).split(';')[0] ?? '';

  return head.trim().toLowerCase();
}

/**
 * One named parameter out of a `Content-Type` header.
 *
 * Quotes around the value are optional in the wire format and
 * optional here, which is why the pattern brackets the capture with
 * `"?` on both sides rather than requiring a matched pair. The value
 * runs to the next quote or semicolon.
 *
 * @param contentType - The header value, parameters and all.
 * @param name - The parameter wanted, matched case-insensitively.
 * @returns Its value, trimmed, or `null` when the header has none.
 */
function ctParam(contentType: string, name: string): string | null {
  const pattern = new RegExp(`${name}\\s*=\\s*"?([^";]+)"?`, 'i');
  const found = asText(contentType).match(pattern);
  const value = found === null
    ? undefined
    : found[1];

  return value === undefined
    ? null
    : value.trim();
}

/**
 * Read a header block into lowercased names and unfolded values.
 *
 * Unfolding comes first, so a value wrapped across three lines is one
 * value before anything looks for a colon — otherwise the second line
 * of a long recipient list reads as a nameless header and is dropped.
 *
 * The FIRST occurrence of a name wins, which is the origin's rule and
 * the one the wire format wants: a relay PREPENDS the headers it
 * adds rather than appending them, so the topmost occurrence of a
 * name is the most recently written one.
 *
 * A line with no colon is skipped rather than reported. The block
 * handed here can be the whole message when it carried no blank line,
 * in which case most of it is body, and warning per line would bury
 * the one warning that says so.
 *
 * See the module header for the one name this drops silently.
 *
 * @param block - The header block, line feeds only.
 * @returns Each name once, lowercased, with its trimmed value.
 */
function parseHeaderBlock(block: string): Record<string, string> {
  const unfolded = asText(block).replace(HEADER_CONTINUATION, ' ');
  const headers: Record<string, string> = {};

  for (const line of unfolded.split('\n')) {
    const colon = line.indexOf(':');

    if (line === '' || colon === -1) {
      continue;
    }

    const name = line.slice(0, colon).trim();
    const key = name.toLowerCase();

    if (key === '' || Object.hasOwn(headers, key)) {
      continue;
    }

    headers[key] = line.slice(colon + 1).trim();
  }

  return headers;
}

/**
 * Split one part into what described it and what it held.
 *
 * A part opening with a blank line carries no headers at all, and it
 * needs its own check rather than falling out of the separator
 * search. One leading break is not the two the search looks for, so
 * without the check such a part takes the no-separator branch: the
 * whole thing goes through the header parser, and its body — which
 * is all of it — is lost.
 *
 * A part with no blank line anywhere is all headers and no body, and
 * that reading is silent here while the same shape at the top level
 * is warned about. The asymmetry is the origin's: a truncated
 * container has already been reported by the boundary walk, and a
 * part inside an intact one that simply carries no body is not a
 * fault worth a sentence.
 *
 * @param text - One part, headers and body together.
 * @returns Its headers and its undecoded body.
 */
function splitHeadersBody(text: string): HeaderSplit {
  const part = asText(text);

  if (part.charAt(0) === '\n') {
    return { headers: {}, body: part.slice(1) };
  }

  const separator = part.indexOf(HEADER_SEPARATOR);

  if (separator === -1) {
    return { headers: parseHeaderBlock(part), body: '' };
  }

  return {
    headers: parseHeaderBlock(part.slice(0, separator)),
    body: part.slice(separator + HEADER_SEPARATOR.length),
  };
}

/**
 * Cut a multipart body into its parts, by the boundary it declared.
 *
 * The split is on the delimiter and the walk starts at the SECOND
 * segment, because everything before the first delimiter is the
 * preamble — text for a reader whose client cannot do multipart, and
 * not a part.
 *
 * Each segment then loses two things that belong to its delimiters
 * rather than to it: the rest of the opening delimiter's line, which
 * may carry transport padding, and the final line feed, which belongs
 * to the delimiter that follows.
 *
 * A body whose closing delimiter never arrives is still read — every
 * part found before the end comes back — and the missing close is
 * warned about. That is the truncation case, and it is the one this
 * function exists to report: the parts are real, and the last one may
 * be short.
 *
 * @param body - The container's body, line feeds only.
 * @param boundary - The delimiter, without its leading dashes.
 * @param warnings - Collector a missing close is reported to.
 * @returns Each part, headers and body still joined.
 */
function splitByBoundary(
  body: string,
  boundary: string,
  warnings: string[],
): readonly string[] {
  const segments = body.split(`--${boundary}`);
  const parts: string[] = [];
  let closed = false;

  for (let index = 1; index < segments.length; index += 1) {
    const segment = segments[index] ?? '';

    if (segment.startsWith(CLOSING_MARK)) {
      closed = true;
      break;
    }

    const opened = segment.replace(BOUNDARY_LINE_TAIL, '');

    parts.push(opened.replace(TRAILING_LINE_FEED, ''));
  }

  if (!closed) {
    warnings.push(`multipart missing closing boundary "${boundary}"`);
  }

  return parts;
}

/**
 * Undo one part's transfer encoding, answering its bytes.
 *
 * Base64 is decoded after its line breaks are dropped, since the
 * breaks were a line-length limit rather than payload.
 * Quoted-printable goes through {@link decodeQuotedPrintable} in its
 * body dialect. Everything else — including a part declaring nothing
 * — means the body already is its bytes, which the latin1 fold has
 * been carrying unchanged since the input arrived.
 *
 * An encoding this reader does not know is warned about and then
 * treated as none. A part encoded some other way comes back as
 * whatever its raw bytes spell, which is legible often enough to be
 * worth more than a dropped part.
 *
 * @param rawBody - The part's body, one latin1 char per byte.
 * @param cte - The declared encoding, or nothing.
 * @param warnings - Collector an unknown encoding is reported to.
 * @returns The part's bytes.
 */
function transferDecode(
  rawBody: string,
  cte: string | undefined,
  warnings: string[],
): Buffer {
  const label = asText(cte).trim();
  const encoding = label.toLowerCase();

  if (encoding === BASE64_ENCODING) {
    return Buffer.from(rawBody.replace(BASE64_WHITESPACE, ''), 'base64');
  }

  if (encoding === QUOTED_PRINTABLE_ENCODING) {
    return decodeQuotedPrintable(rawBody, false);
  }

  if (!IDENTITY_ENCODINGS.includes(encoding)) {
    warnings.push(`unknown content-transfer-encoding "${cte}"`);
  }

  return Buffer.from(rawBody, 'latin1');
}

/**
 * Read one leaf part's body as text: bytes first, then characters.
 *
 * The two steps are separate functions and are called in this order
 * exactly once, which is the whole of the discipline the module
 * header describes.
 *
 * @param rawBody - The part's body, one latin1 char per byte.
 * @param cte - The declared transfer encoding, or nothing.
 * @param charset - The declared charset, or `null` for none.
 * @param warnings - Collector both steps report to.
 * @returns The part's text.
 */
function decodeBody(
  rawBody: string,
  cte: string | undefined,
  charset: string | null,
  warnings: string[],
): string {
  const bytes = transferDecode(rawBody, cte, warnings);

  return decodeCharset(bytes, charset, warnings);
}

/**
 * Walk one part: down into a container, or into the accumulators.
 *
 * A container recurses, bounded by {@link MAX_MULTIPART_DEPTH}, and a
 * leaf decodes and joins. Both refusals a container can meet — too
 * deep, and no boundary declared — warn and return rather than
 * throwing, so the parts already read survive the part that was not.
 *
 * The `||` in front of the content type is deliberate rather than a
 * missed nullish coalesce: a `Content-Type:` header carrying nothing
 * is a header that declared nothing, and both readings have to land
 * on the same default or an empty header would be walked as a part of
 * type `''` and ignored.
 *
 * The `text/plain` test cannot decide anything on its own — every
 * string it matches also opens with `text/` — and it is kept for the
 * same reason `parse-csv.ts` keeps its dead alternatives: preserving
 * behaviour is the rule in this directory, the parity suite is the
 * gate that decides whether the port landed, and the line says what
 * the original says.
 *
 * @param headers - This part's headers, lowercased.
 * @param body - This part's body, undecoded.
 * @param depth - How many containers are already open above it.
 * @param acc - The accumulators this fills.
 * @param warnings - Collector every fault below is reported to.
 */
function walkPart(
  headers: Record<string, string>,
  body: string,
  depth: number,
  acc: PartAccumulator,
  warnings: string[],
): void {
  const contentType = headers['content-type'] || DEFAULT_CONTENT_TYPE;
  const type = ctType(contentType);

  if (type.startsWith(MULTIPART_PREFIX)) {
    if (depth >= MAX_MULTIPART_DEPTH + 1) {
      warnings.push(WARNED.deepMultipart);
      return;
    }

    const boundary = ctParam(contentType, 'boundary');

    if (boundary === null || boundary === '') {
      warnings.push(WARNED.noBoundary);
      return;
    }

    for (const segment of splitByBoundary(body, boundary, warnings)) {
      const part = splitHeadersBody(segment);

      walkPart(part.headers, part.body, depth + 1, acc, warnings);
    }

    return;
  }

  const charset = ctParam(contentType, 'charset');
  const cte = headers['content-transfer-encoding'];
  const content = decodeBody(body, cte, charset, warnings);

  if (type === HTML_TYPE) {
    acc.html = acc.html === null
      ? content
      : acc.html + content;
  } else if (type === DEFAULT_CONTENT_TYPE || type.startsWith(TEXT_PREFIX)) {
    acc.text = acc.text === null
      ? content
      : acc.text + content;
  } else {
    warnings.push(`ignored part of type "${type}"`);
  }
}

/**
 * What a thrown value calls itself.
 *
 * Truthiness on `message` rather than an `instanceof` check, because
 * that is what the original tested and the two disagree over a thrown
 * object that is not an `Error` and carries a message anyway.
 *
 * @param error - Whatever was thrown.
 * @returns Its message, or its own string conversion.
 */
function messageOf(error: unknown): string {
  const carrier = error as { readonly message?: unknown };
  const reported = error === null || error === undefined
    ? undefined
    : carrier.message;

  return reported
    ? String(reported)
    : String(error);
}

/**
 * Read a message into its five headers and its two text bodies.
 *
 * The entry point, and the only export that does anything. It never
 * throws: the whole read sits inside one guard, and a failure that
 * escaped every local refusal above arrives as a `parse error:`
 * warning on a result whose headers are empty and whose bodies are
 * `''`. A caller checking `parse_warnings` learns the difference; a
 * caller that does not still gets an object of the right shape.
 *
 * Line endings are folded to line feeds first — CRLF and then any
 * lone carriage return — so every split below is over one separator.
 * Doing it once here rather than at each split is what keeps the
 * boundary and header rules readable, and it is safe because both
 * forms are ASCII and the fold happens after the byte-faithful step
 * rather than instead of it.
 *
 * A message with no blank line in it is all headers and no body, and
 * that is warned about because at the top level it usually means the
 * input was cut short. The headers found are still returned.
 *
 * @param raw - A `Buffer`, a string, or something that is neither.
 * Anything else is coerced with a warning, because the spliced copy
 * runs where no type was ever checked.
 * @returns The message, plus what could not be read if anything.
 */
export function parseEml(raw: unknown): EmlMessage {
  const warnings: string[] = [];
  const acc: PartAccumulator = { text: null, html: null };
  let headers: EmlHeaders = EMPTY_HEADERS;

  try {
    const folded = toByteString(raw, warnings);
    const source = folded.replace(CRLF, '\n').replace(LONE_CR, '\n');
    const separator = source.indexOf(HEADER_SEPARATOR);

    if (separator === -1) {
      warnings.push(WARNED.noSeparator);
    }

    const headerText = separator === -1
      ? source
      : source.slice(0, separator);
    const body = separator === -1
      ? ''
      : source.slice(separator + HEADER_SEPARATOR.length);
    const headerMap = parseHeaderBlock(headerText);

    headers = {
      from: decodeEncodedWords(headerMap['from'] || ''),
      to: decodeEncodedWords(headerMap['to'] || ''),
      subject: decodeEncodedWords(headerMap['subject'] || ''),
      date: decodeEncodedWords(headerMap['date'] || ''),
      replyTo: decodeEncodedWords(headerMap['reply-to'] || ''),
    };

    walkPart(headerMap, body, 0, acc, warnings);
  } catch (error) {
    warnings.push(`parse error: ${messageOf(error)}`);
  }

  const text = acc.text === null
    ? ''
    : acc.text;
  const html = acc.html === null
    ? ''
    : acc.html;

  return warnings.length === 0
    ? { headers, text, html }
    : { headers, text, html, parse_warnings: warnings };
}
