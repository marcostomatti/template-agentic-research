/**
 * @packageDocumentation
 * Two functions the source failures queue serves a stored payload
 * through: one that replaces every character a response has no
 * business carrying raw, and one that shortens a string without
 * cutting a character in half.
 *
 * `GET /sources/:id/failures` answers `body` and `parse_error` from
 * documents a parser refused. That is the likeliest text in the
 * corpus to carry a control byte, because what made a payload fail
 * to parse is often what carries one, and it is text that travels
 * onward from the response into a terminal, a log line or a pasted
 * support ticket. A raw NUL makes `git diff` render `Bin` forever
 * and makes POSIX grep report no match for text that is present; a
 * raw ESC lets stored content rewrite the terminal that prints it.
 * Both failures are silent, which is what makes them worth a pass
 * of their own.
 *
 * The masking is deliberately more than serialization does, and the
 * gap is measured rather than assumed. Over the 33 code points from
 * DEL through the end of C1, `JSON.stringify` passes all 33 through
 * as the raw character; over the 32 C0 code points it passes none.
 * So a response built from unmasked text carries DEL and every C1
 * byte onto the wire intact, and escapes the C0 half only because
 * the grammar leaves it no choice.
 *
 * C0 is taken whole, TAB, LF and CR included, and that is a wider
 * set than `ar/no-unsafe-unicode` reports in a source file. The two
 * rules have different subjects. That one protects a file a human
 * edits, where those three characters are the file's own structure;
 * this one masks a value being quoted into a JSON string, where
 * they are not structural at all and where a bare CR still rewrites
 * the line of whatever prints the parsed result. What it costs is
 * legibility: a captured page answers as one long line where
 * every newline reads as `\u000a`. A reviewer reading a payload
 * that broke a parser wants what was stored rather than a rendering
 * of it, and `docs/architecture/08-http-api.md` states the rule as
 * every C0 control — so exempting the three is a change to that
 * sentence and not only to this comment.
 *
 * What is masked is a TRANSPORT hazard list, not the editor-safety
 * list the control-byte gate applies to tracked files. Bidirectional
 * overrides, zero-width characters and U+2028 / U+2029 are left
 * alone: each is a hazard in a file somebody reviews, and none of
 * them can silence a diff or a grep of a response. Nothing here
 * escapes HTML, SQL or a shell either. A mask is not a sanitizer,
 * and what it answers is a JSON string rather than a template.
 *
 * The two functions compose in one order only, and the caller owes
 * it. {@link takeCodePoints} runs on the STORED text and
 * {@link maskControlBytes} on what that answers. Cutting first is
 * what makes the cap count stored characters rather than escape
 * characters — masking first lets a single NUL spend six of the
 * budget, and lets the cut land in the middle of a `\uXXXX` it
 * wrote — and cutting by code point is what stops the cap itself
 * from manufacturing a lone surrogate that was never stored.
 */

/** Builds one character from its code point. */
const charFrom = String.fromCharCode;

/** Digits in the `\uXXXX` form, which every masked character fits. */
const ESCAPE_DIGITS = 4;

/**
 * Every character {@link maskControlBytes} replaces: C0, DEL, C1,
 * and both surrogate ranges.
 *
 * Built from code points rather than written as a class literal for
 * two reasons pointing the same way. A control character inside a
 * pattern literal is a lint error here, and a source file carrying
 * one is the exact failure this module keeps out of a response.
 * `src/lib/audit-log.ts` builds its own class the same way.
 *
 * The `u` flag is load-bearing rather than a habit. Under it the
 * engine matches by CODE POINT, so an astral character is offered
 * to the class whole and its two surrogate halves are never offered
 * separately — which is what makes a bare surrogate range a
 * LONE-surrogate test needing no lookahead and no lookbehind. Drop
 * the flag and every emoji in a stored body answers as two escapes.
 *
 * One instance is shared, which is safe for the one method that
 * uses it: `replace` sets `lastIndex` to 0 before matching and
 * leaves it there (measured), where `test` would advance it and
 * make every second call answer differently. Nothing here calls
 * `test`.
 */
const MASKED_CHARS = new RegExp(
  '['
  + charFrom(0x00) + '-' + charFrom(0x1f)
  + charFrom(0x7f) + '-' + charFrom(0x9f)
  + charFrom(0xd800) + '-' + charFrom(0xdfff)
  + ']',
  'gu',
);

/**
 * One matched character as its `\uXXXX` text form.
 *
 * @param match - A single UTF-16 unit matched by
 *   {@link MASKED_CHARS}. Every member of that class is below
 *   U+10000, so four hex digits is the exact width rather than a
 *   minimum.
 * @returns Six ASCII characters: a backslash, a `u`, and the code
 *   in lower-case hex — the same spelling `JSON.stringify` uses for
 *   the half of the set it escapes on its own.
 */
function escapeOne(match: string): string {
  return '\\u' + match.charCodeAt(0)
    .toString(16)
    .padStart(ESCAPE_DIGITS, '0');
}

/**
 * `text` with every C0 control, DEL, every C1 control and every
 * lone surrogate replaced by its `\uXXXX` text form.
 *
 * @param text - A stored value, as read from the row.
 * @returns The same text with those characters written as escapes.
 *   Text carrying none of them is answered unchanged.
 *
 * @remarks
 * The answer is safe to pass through this function again: what it
 * writes is a backslash, a `u` and four hex digits, and none of
 * those is in the masked set. That is a property worth having
 * rather than a coincidence, because a value can reach a response
 * having already been masked once by a caller that could not know
 * whether another would.
 *
 * A valid astral pair is NOT touched. Only a surrogate standing on
 * its own is, and a stored body can carry one: a truncating writer,
 * a bad transcode or a parser that gave up mid-character all leave
 * one behind, and it is the one character class that cannot be
 * serialized as itself.
 */
export function maskControlBytes(text: string): string {
  return text.replace(MASKED_CHARS, escapeOne);
}

/**
 * The first `limit` CODE POINTS of `text`.
 *
 * @param limit - How many code points to keep. A non-negative
 *   integer; `0` answers the empty string.
 * @param text - The text to shorten.
 * @returns `text` itself when it is already that short, and its
 *   first `limit` code points otherwise.
 * @throws When `limit` is not a non-negative integer. The cap this
 *   serves is a module constant rather than caller input, so a
 *   value that is not one is a wiring mistake — and the quiet
 *   alternatives are worse than a throw: a negative limit answers
 *   the empty string through `slice`, which reads on the wire as a
 *   stored payload that was empty.
 *
 * @remarks
 * Cutting by code point rather than by UTF-16 unit is the whole
 * point. `text.slice(0, limit)` splits an astral pair whenever the
 * cap lands between its halves, leaving a lone high surrogate as
 * the last character — a character that was never stored, that
 * {@link maskControlBytes} then has to escape, and that a client
 * decoding the answer cannot render.
 *
 * The short-circuit is exact rather than an optimisation that
 * approximates: a string's code point count is never more than its
 * UTF-16 length, so `text.length <= limit` is sufficient on its own
 * to say the whole string fits.
 */
export function takeCodePoints(text: string, limit: number): string {
  if (!Number.isInteger(limit) || limit < 0) {
    throw new Error(
      '[control-bytes] code point limit must be a non-negative ' +
      `integer, not ${limit}. Either the cap constant holds a value ` +
      'that is not one, or a number reached here without being ' +
      'parsed into one.',
    );
  }

  if (text.length <= limit) {
    return text;
  }

  const codePoints = Array.from(text);

  return codePoints.slice(0, limit).join('');
}
