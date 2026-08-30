/**
 * @packageDocumentation
 * sanitize-md — the pass that lets untrusted text be shown without any
 * of it being obeyed, and the slugger that lets a name taken out of
 * that text reach a filesystem path.
 *
 * THE RULE, and everything below is one expression of it: untrusted
 * text may be DISPLAYED, never INTERPRETED. A digest, a note or a
 * research brief is rendered by something that treats its own markup
 * as instructions, so a body somebody else wrote is not inert text. An
 * unmodified image embed is a network fetch at render time, which is a
 * read receipt on a private document. A bare link is one click away
 * from being followed. A wiki-link opener joins a graph, and a leading
 * hash run joins a tag index — both of them writing into a structure
 * the reader owns and the author of the text does not.
 *
 * What that rule is NOT is a filter on what the text says. Nothing
 * here decides whether a sentence is hostile, and every word a reader
 * was going to see comes back. An instruction, an insult and a weather
 * reading all come out of {@link sanitizeUntrusted} with their words
 * intact and in order — the only thing that changes is that no form in
 * them is left able to act. That is deliberate and it is the half a
 * reader is most likely to get backwards: removing the words would
 * destroy the evidence that somebody tried, and would still leave the
 * next form nobody thought of. Neutralizing the forms leaves the
 * attempt legible, which is what a reviewer actually needs.
 *
 * One pass deletes rather than escapes, and it is the exception that
 * fits the rule: an angle-bracket tag is removed whole, attributes
 * included. What is deleted there is markup, never prose — the text
 * BETWEEN an opening and a closing tag is left exactly as it was, so a
 * bolded sentence arrives unbolded and complete. A link hidden in an
 * attribute is the one thing that does not survive the pass, and that
 * is the point of it.
 *
 * The forms, and what each becomes:
 *
 * ```text
 * ![alt](url)   an inline-code plain link, fetched by nothing
 * <img ...>     removed, as every angle-bracket tag is
 * https://...   the same characters, inside inline code
 * [[name]]      the first bracket escaped, so it opens no link
 * # heading     the run escaped, so it opens no heading or tag
 * ---           escaped, so it underlines nothing above it
 * ```
 *
 * The last one is the same interpretation as the leading hash run,
 * reached from the other side: a line of nothing but dashes or equals
 * signs promotes the line ABOVE it to a heading, so a plain ASCII
 * separator inside a quoted body silently turns the sentence before it
 * into a title of the enclosing document.
 *
 * Order is the whole design and it is not interchangeable. Image
 * embeds are neutralized FIRST and parked behind an index-keyed marker
 * so no later pass can reach inside them — the bare-link pass would
 * otherwise wrap a URL that is already inside a code span, and the
 * result would depend on which rule happened to run first. The markers
 * are restored LAST, verbatim, which is what makes the parked span
 * final rather than merely early. And because a marker is only safe
 * while untrusted text cannot forge one, every occurrence of the
 * marker prefix is cut out of the input before the first pass runs.
 *
 * This library is dual-context, like every module under `src/lib/`:
 * the default suite imports it, and `scripts/build-workflows.ts`
 * splices the transpiled text into a Code node body where nothing
 * resolves a specifier. So {@link asText} is written out here rather
 * than shared with the identical guard in `parse-csv.ts` — a second
 * module would need the import the splice rule forbids, which is the
 * same reason this file is not split.
 *
 * This is a PORT, and what it KEEPS is the whole of the behaviour:
 * every pattern character for character, the order the passes run in,
 * the marker text, the rendered form an image embed becomes, the
 * escape each form receives, the cap and the trims in the slugger, and
 * the coercion in front of both entry points.
 * `tests/parity/sanitize-md.parity.test.ts` is what says so rather
 * than this paragraph — it drives both exports and their originals
 * over one neutral corpus and fails on the first difference.
 *
 * What it DROPS is four things, none of them behaviour. The CommonJS
 * export block at the foot of the original becomes declaration
 * exports, which is what the splice strips and what a Code node can
 * run. `var` becomes `const` and `let`. The restore step names the
 * absent case explicitly, because `noUncheckedIndexedAccess` types the
 * lookup as possibly-absent where the original simply let the absent
 * value coerce — {@link restoreSpan} keeps that coercion rather than
 * repairing it, and the paragraph below is why. And the slugger's
 * three patterns are hoisted to named constants beside the six the
 * original already declares up there, which moves nothing: all nine
 * are used through `String.prototype.replace`, and a global pattern's
 * cursor is reset by that method before it starts.
 *
 * The fifth thing it leaves behind is subject matter rather than
 * code: the original neutralized one particular kind of message on its
 * way into one particular reader. The forms are a property of the
 * markup dialect and not of either, so the port carries the passes and
 * not the thing they were pointed at.
 *
 * Two behaviours are preserved DELIBERATELY and are worth finding here
 * rather than in a debugger.
 *
 * The marker strip is a SINGLE pass, so removing one occurrence can
 * join its neighbours into a fresh one: text carrying the prefix with
 * another copy of its own first half in front comes out of the strip
 * holding a marker the strip just created. A forged marker whose index
 * names no parked span is restored as the text `undefined`, and one
 * whose index names a real span duplicates it. Both are reachable and
 * both are pinned by cases. The repair is real and obvious — strip
 * until no occurrence is left — and it is not this file's to make: the
 * parity suite is the gate that decides whether the port landed, so a
 * repair here fails it. It is a decision for the phase that owns the
 * callers, and until then the cases are what stop anybody meeting it
 * by surprise.
 *
 * An image embed whose alt text carries a closing square bracket is
 * not recognised as an embed at all, and so is left exactly as it
 * arrived — visible, and still an embed. The alt group stops at the
 * first such bracket by construction. The same rule in reverse is what
 * makes the pass safe on prose that merely looks like markup, so the
 * two cannot be separated without changing what the pattern matches.
 *
 * The other two dual-context rules hold by construction: this file
 * imports nothing, and it keeps no state between calls — the marker
 * prefix is cut with a plain string split, and every pattern here is
 * used through `String.prototype.replace`, which resets a global
 * pattern's cursor before it starts.
 * `tests/build/lib-splice.test.ts` registers it and reads what a real
 * build made of it.
 */

/**
 * The first half of the marker that parks an already-neutralized span.
 *
 * Purely alphanumeric and underscores, so no other pass in this file
 * matches any part of it: it holds no angle bracket, no scheme, no
 * square bracket, no leading hash and no dash or equals run. That is
 * what lets a parked span sit in the text through every later pass and
 * come back out untouched.
 *
 * It is also the string cut out of the input before anything else
 * runs, which is what stops untrusted text from writing its own
 * marker. See the module header for the one way that cut can be
 * outrun.
 */
const PLACEHOLDER_PREFIX = 'SANMD_PROTECTED_';

/** The second half, closing the index the marker carries. */
const PLACEHOLDER_SUFFIX = '_ENDSANMD';

/**
 * The marker as a pattern, for the restore pass.
 *
 * Written out rather than assembled from the two halves above, which
 * is the original's shape and is kept: a pattern built by
 * interpolation would have to escape what it interpolated, and the
 * escaping would be the only thing a reader could not check by
 * looking. `tests/lib/sanitize-md.test.ts` holds the three against
 * each other instead, so a drift between them fails a case rather than
 * silently leaving a marker nothing restores.
 */
const PLACEHOLDER_RE = /SANMD_PROTECTED_(\d+)_ENDSANMD/g;

/**
 * How many characters a slug keeps when a caller names no cap.
 *
 * Sixty, which is short enough that a slug plus a directory, an
 * extension and a date stays inside the shortest path limit any target
 * filesystem imposes, and long enough that two names differing late
 * still differ.
 */
const SLUG_MAX_LEN = 60;

/**
 * An image embed: a bang, a bracketed alt text, a parenthesised URL.
 *
 * The alt group stops at the first closing square bracket and the URL
 * group at the first closing parenthesis, which is what keeps the
 * pattern from running away across a whole document — and is also why
 * an alt text or a URL carrying one of those characters is not
 * recognised. See the module header.
 */
const IMAGE_EMBED_RE = /!\[([^\]]*)\]\(([^)]*)\)/g;

/**
 * A raw markup tag, opening or closing.
 *
 * A letter is required immediately after the bracket, which is the
 * whole reason a comparison written in prose survives: `a < b` and a
 * bare `<3` carry no letter there and are left alone. The body of the
 * tag runs to the first closing bracket, so a tag nothing closes is
 * not a tag as far as this pass is concerned and stays visible.
 */
const HTML_TAG_RE = /<\/?[a-zA-Z][^>]*>/g;

/**
 * A bare link, either scheme.
 *
 * The character class stops at whitespace, at both angle brackets, at
 * a backtick, and at the closing bracket of a parenthesis or a square
 * pair — so a link at the end of a sentence inside brackets does not
 * swallow the bracket into the code span that is about to be wrapped
 * around it. A trailing full stop IS swallowed, which is the
 * original's reading and is left alone: the alternative is a pattern
 * that has to decide whether a full stop is part of a path.
 */
const BARE_URL_RE = /https?:\/\/[^\s<>`)\]]+/g;

/**
 * A wiki-link opener.
 *
 * Only the opener, because escaping the first bracket is enough to
 * stop the pair from being read as a link — and leaving the closer
 * alone means the visible text still reads as the author wrote it.
 */
const WIKILINK_OPEN_RE = /\[\[/g;

/** A run of hash characters opening a line, in any line of the text. */
const LEADING_HASH_RE = /^(#+)/gm;

/**
 * A line of nothing but dashes or equals signs, with optional trailing
 * spaces or tabs.
 *
 * Such a line is an underline: it promotes the line above it to a
 * heading. The trailing whitespace is matched but is NOT written back
 * by the escape, so a separator that ended in spaces comes out without
 * them — the original's reading, kept, and pinned by a case.
 */
const SETEXT_UNDERLINE_RE = /^([-=]+)[ \t]*$/gm;

/** Every run of characters a slug may not carry. */
const SLUG_SEPARATOR_RE = /[^a-z0-9]+/g;

/** A separator run at either end of a slug. */
const SLUG_EDGE_RE = /^-+|-+$/g;

/** A separator run the cap left stranded at the end. */
const SLUG_TRAILING_RE = /-+$/g;

/**
 * Whatever a caller passed, as text.
 *
 * Takes `unknown` on purpose. The spliced copy runs in a Code node
 * where no type was ever checked, so this guard is all that stands
 * between a node handing this an absent field and a crash inside a
 * `replace` — and typing the parameter as `string` would let the
 * compiler delete the reasoning while the runtime still needed it.
 *
 * Absence answers `''`, and everything else answers its own string
 * conversion. That includes values whose conversion THROWS: an object
 * carrying a hostile `toString` refuses here rather than downstream,
 * which is where a caller can still tell what happened.
 *
 * @param value - Anything at all, including nothing.
 * @returns The text to neutralize.
 */
function asText(value: unknown): string {
  return value === null || value === undefined
    ? ''
    : String(value);
}

/**
 * One parked span, by the index its marker carried.
 *
 * The absent case is reachable — see the module header — and what it
 * answers is what the original answered, arrived at the same way: a
 * replacer returning nothing has its result coerced to text, and the
 * text of nothing is the word. Written as an explicit conversion
 * because the type system will not let the coercion happen by
 * accident, and NOT as a repair, because the parity suite is the gate
 * that decides whether this port landed.
 *
 * @param spans - Every span parked so far, in the order they were.
 * @param index - The index the marker carried, as text.
 * @returns The parked span, or the word an absent one becomes.
 */
function restoreSpan(spans: readonly string[], index: string): string {
  const rendered = spans[Number(index)];

  return rendered === undefined
    ? String(rendered)
    : rendered;
}

/**
 * Neutralize untrusted text so it can be embedded verbatim.
 *
 * Every word survives, in order, including words that read as
 * instructions: this pass bounds what the text can DO and says nothing
 * about what it says. What comes back is safe to place inside a
 * document a markup renderer will render, and unsafe to place inside a
 * shell, a query or a path — the slugger next door is the only route
 * from untrusted text to a filesystem name.
 *
 * The passes run in the order the module header fixes, and their one
 * visible interaction is worth knowing before reading an output: an
 * image embed sitting at the end of a bare link is parked before the
 * link pass runs, so the link wraps the marker too and the restored
 * span comes back INSIDE the link's code span. Backticks nest in the
 * result and that is the original's reading.
 *
 * Never throws for any text. It can still throw for a value that is
 * not text and refuses to become text, which is {@link asText}'s
 * doing and is the one ending a caller has to be ready for.
 *
 * @param text - The untrusted text. Anything that is not a string is
 * read through {@link asText} first — the guard exists for the spliced
 * copy, which runs where no type was ever checked.
 * @returns The same words, with every active form neutralized.
 */
export function sanitizeUntrusted(text: string): string {
  // Cut every forged marker prefix before one can be mistaken for
  // ours. A single pass, which is the original's reading and is
  // outrunnable — see the module header.
  let s = asText(text)
    .split(PLACEHOLDER_PREFIX)
    .join('');

  // Neutralized spans, restored last so no later pass reinterprets
  // one.
  const protectedSpans: string[] = [];

  function protect(rendered: string): string {
    const index = protectedSpans.length;
    const token = PLACEHOLDER_PREFIX + index + PLACEHOLDER_SUFFIX;

    protectedSpans.push(rendered);

    return token;
  }

  // 1. Image embeds become a parked inline-code plain link, before the
  //    link pass, so their inner URL is neutralized exactly once.
  s = s.replace(IMAGE_EMBED_RE, function (_match, alt: string, url: string) {
    return protect('`[image link removed: ' + alt + '](' + url + ')`');
  });

  // 2. Raw tags go.
  s = s.replace(HTML_TAG_RE, '');

  // 3. Bare links become inline code, so a click is deliberate. Embeds
  //    are already parked, so only genuinely bare links remain.
  s = s.replace(BARE_URL_RE, function (match: string) {
    return '`' + match + '`';
  });

  // 4. Wiki-link openers are escaped.
  s = s.replace(WIKILINK_OPEN_RE, '[\\[');

  // 5. Leading heading runs are escaped.
  s = s.replace(LEADING_HASH_RE, '\\$1');

  // 5b. Underlines are escaped, which is the other way untrusted text
  //     makes a heading.
  s = s.replace(SETEXT_UNDERLINE_RE, '\\$1');

  // 6. Parked spans come back verbatim.
  s = s.replace(PLACEHOLDER_RE, function (_match, index: string) {
    return restoreSpan(protectedSpans, index);
  });

  return s;
}

/**
 * Reduce a name to a filesystem-safe slug.
 *
 * Lowercased, every run of anything else collapsed to a single hyphen,
 * hyphens trimmed from both ends, cut to the cap, and any hyphen the
 * cut stranded at the end removed. What comes back holds only
 * lowercase letters, digits and hyphens, and is the ONLY route by
 * which untrusted text may reach a path.
 *
 * The reduction is lossy on purpose and in a way worth stating: it
 * collapses rather than encodes, so two different names can reduce to
 * the same slug, and a name written in a script with no ASCII letters
 * in it reduces to nothing at all. A caller that needs a name back
 * must keep the original beside the slug; a caller that needs
 * uniqueness must add it, because this cannot supply it.
 *
 * The cap is honoured only when a caller passes a NUMBER. Anything
 * else — a numeric string, an absent argument — falls back to
 * {@link SLUG_MAX_LEN}, which is the original's reading and matters
 * because a cap read out of configuration arrives as text. A cap that
 * is not a usable count still applies rather than being rejected:
 * `NaN` and zero reduce the slug to nothing, and a negative cap is an
 * offset from the END — the cut is a slice — so it drops that many
 * characters instead of keeping them. Each is a caller's mistake
 * arriving as a wrong name rather than as an error.
 *
 * @param name - The name to reduce. Anything that is not a string is
 * read through {@link asText} first.
 * @param maxLen - How many characters to keep. Anything that is not a
 * number means {@link SLUG_MAX_LEN}.
 * @returns The slug, which may be empty.
 */
export function slugify(name: string, maxLen?: number): string {
  const cap = typeof maxLen === 'number'
    ? maxLen
    : SLUG_MAX_LEN;

  return asText(name)
    .toLowerCase()
    .replace(SLUG_SEPARATOR_RE, '-')
    .replace(SLUG_EDGE_RE, '')
    .slice(0, cap)
    .replace(SLUG_TRAILING_RE, '');
}
