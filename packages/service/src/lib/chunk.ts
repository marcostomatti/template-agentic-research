/**
 * @packageDocumentation
 * chunk — the only thing a model is ever handed, and the ceiling
 * that keeps it affordable.
 *
 * A model never sees a document body here. It sees a small
 * fixed-shape digest the deterministic layer assembled: the fields
 * that layer already resolved, plus a short excerpt of the prose it
 * could not resolve into anything. Whatever has already been worked
 * out is passed as a resolved field rather than as text for a model
 * to re-derive, because re-deriving it costs tokens and can be
 * wrong.
 *
 * ## THE RULE
 *
 * There is no raw-body fallback. An input that cannot be reduced to
 * a chunk comes back from {@link buildChunk} as `usable: false`
 * carrying a {@link ChunkResult.reason}, and the caller routes it to
 * review. There is no third option, and in particular no path that
 * sends the body because the reduction failed — that is precisely
 * how an unbounded body reaches a model in the first place.
 *
 * The ceiling is enforced on the way OUT rather than merely
 * intended. Whatever the assembly above it did, the chunk that comes
 * back is hard-truncated to {@link MAX_CHUNK_CHARS}, so no later
 * edit to the header, the excerpt or the stand-in texts can widen it
 * by accident.
 *
 * ## What it cost to learn
 *
 * The original was written after three model chains were each handed
 * a document body verbatim: 2,323 prompt tokens per call averaged, a
 * worst case around 15,000 characters that were almost entirely
 * message-format spacers and tracking parameters, 81 calls in one
 * pass, 732,000 tokens in that pass, and a month's budget spent in
 * 43 minutes. One tracked link is the same shape in miniature —
 * roughly 40 characters of address wrapped in roughly 900 of
 * tracking parameters, every one of them billed as input.
 *
 * So the cuts below are not tidying. Each one is a measured share of
 * a bill, and the report they fill in is what makes a spend
 * explainable afterwards.
 *
 * ## What this port takes as input, and why
 *
 * The HEADER FIELD ROSTER is an argument here. The original declared
 * six header fields and their stand-in texts as a module constant,
 * which was right for one deployment researching one subject. Here
 * the fields a document resolves to are the DOMAIN's: they are
 * declared in that domain's field contract — the `fieldContract`
 * member of `domains.settings`, keyed by field name — and filled in
 * a finding's `fields` payload under those same names. A roster in
 * this file would be one domain's vocabulary compiled into every
 * other domain's prompt.
 *
 * So a caller hands in {@link ChunkInput.fields}, an ORDERED list of
 * {@link ChunkField} derived from that contract, and
 * {@link ChunkInput.values}, the payload each entry is read out of.
 * Ordered rather than keyed, because the header is read top to
 * bottom and the ceiling cuts from the end: which field comes first
 * is part of what a chunk says, and a record has no order to
 * declare.
 *
 * Three consequences follow, and each is somewhere this file is
 * longer than the original could afford to be.
 *
 * The IDENTIFYING flag. The original's fields-only refusal named two
 * of its six fields outright — a record with neither was not worth a
 * call. A port cannot name them, so an entry declares whether it is
 * one of the fields that make a fields-only chunk worth reading, and
 * the refusal asks whether any of those resolved.
 *
 * The ROSTER BOUND. The original could call a bad field list a
 * programming error, because it wrote the list itself. A roster
 * arriving from configuration cannot be called that, so
 * {@link buildChunk} refuses an unusable entry the way it refuses
 * everything else: by answering `usable: false` with a reason,
 * never by throwing. What it checks is what an entry can DO — open
 * one labelled line, and still say something when its value resolved
 * to nothing.
 *
 * The LINE BOUND, which is the one behavioural divergence in the
 * file and is argued in full on {@link buildChunk}.
 *
 * ## What is kept
 *
 * The whole of the reduction, pass for pass: the invisible-run strip
 * and its space substitution, the markup and image-placeholder
 * strip, the tracking-parameter strip that keeps a link's path and
 * drops its query, the quoted-chain cut with its marker list and its
 * per-line fallback, the signature and footer cut, the prose window
 * between a greeting and a sign-off, the whitespace collapse, the
 * boundary-aware truncation with its sentence share, the excerpt
 * ceiling, the removal report, the token estimate and its ratio, the
 * assembly, the stand-in line for a record that carried no prose,
 * and the final cap.
 *
 * A parity suite is what says so rather than this paragraph, and it
 * is `tests/parity/chunk.parity.test.ts`. Its leg is the KERNEL —
 * the strips, the cuts, the excerpt build and the estimate — driven
 * against the original over neutral fixtures. {@link buildChunk}
 * itself sits outside that leg by construction: its header comes
 * from a roster the original does not have, so no one input can
 * drive both sides of it. Characterization cases in
 * `tests/lib/chunk.test.ts` are what cover it instead.
 *
 * ## What is dropped
 *
 * Four things, and two of them a caller can see. The guarded
 * CommonJS export block at the foot of the original becomes
 * declaration exports, which is what the splice strips and what a
 * Code node can run, and `var` becomes `const`; neither moves an
 * answer. The baked field list is gone, for the reason above, which
 * moves every header. And the stand-in line for a record with no
 * prose is re-authored: the original's named the one kind of record
 * its deployment researched, where {@link NO_PROSE_LINE} says only
 * what is true of any of them.
 *
 * The export surface is WIDER than the original's rather than
 * narrower. Every pass the reduction runs is exported here, because
 * the passes cannot be separate modules — see the dual-context note
 * below — so exporting them is the only way one of them is reachable
 * on its own, by a caller composing them in a node or by a case
 * driving one. The original exported the six its own callers
 * happened to need. What stays private is the header assembly and
 * the readers under it, which have no caller outside this file.
 *
 * ## What is preserved deliberately
 *
 * Five readings that look like faults until the argument for each is
 * read. All five are the original's, and each one has a case of its
 * own in `tests/lib/chunk.test.ts`.
 *
 * {@link estimateTokens} takes a number as a CHARACTER COUNT and
 * anything else as text to measure, so a caller passing the text
 * itself and a caller passing its length get the same answer. A
 * number that is not a count comes straight back through the
 * arithmetic: `NaN` characters estimate as `NaN` tokens, which is
 * visibly nothing rather than a plausible zero.
 *
 * {@link truncateOnBoundary} reads a NEGATIVE limit as an offset
 * from the END, because the cut is a slice rather than a check. That
 * is unreachable from this file, whose two call sites pass ceilings,
 * and it is what a caller of the export would meet.
 *
 * The sentence boundary is preferred only when it falls in the last
 * part of the allowance — see {@link SENTENCE_BOUNDARY_SHARE} — so a
 * full stop early in a long passage does not throw most of the
 * allowance away.
 *
 * {@link ChunkResult.excerpt_chars} is reported even for a refused
 * chunk, because it is usually what the refusal is ABOUT: a caller
 * looking at a queue of refusals wants to see the prose lengths that
 * produced them.
 *
 * And the final cap runs even when the assembly is already inside
 * it, so {@link ChunkResult.truncated} is true when EITHER the
 * excerpt or the whole chunk was cut. One flag for two cuts is the
 * original's, and the report beneath it separates them.
 *
 * ## Null and zero
 *
 * Every count here is measured, which is why none of them is
 * nullable. A chunk that was refused carries `chars: 0` and
 * `estimated_tokens: 0` because the chunk it carries is the empty
 * string — that is a measured zero, not an unmeasured quantity
 * wearing one. Nothing in this file reports a count it did not take.
 *
 * ## Dual context
 *
 * Like every module under `src/lib/`, this one is imported by the
 * default suite AND spliced into a workflow Code node body by
 * `scripts/build-workflows.ts`. So it imports nothing, keeps no
 * state between calls, and cannot be split into smaller files — a
 * second module would need the import the splice rule forbids, which
 * is why `many small files` has no expression here.
 * `tests/build/lib-splice.test.ts` registers it and reads what a
 * real build made of it.
 *
 * The patterns built from code points are the other half of that
 * rule. A source file here stays plain ASCII, so a class holding
 * invisible characters cannot be written as a literal without
 * putting those characters in the source. They are assembled from
 * their code points instead, as an alternation rather than a class:
 * a class holding a zero-width joiner between its neighbours is a
 * lint error, and the alternation matches exactly the same
 * characters.
 */

// ---------------------------------------------------------------------------
// Ceilings
// ---------------------------------------------------------------------------

/**
 * The whole assembled chunk, in characters.
 *
 * This is the budget, written down. Changing it changes what every
 * model call in the system costs, which is why it is enforced at the
 * last step of {@link buildChunk} rather than trusted to the steps
 * above it.
 */
export const MAX_CHUNK_CHARS = 6000;

/**
 * The free prose inside a chunk, in characters.
 *
 * The header is bounded by the roster that produced it; this bounds
 * the part that came from a document and could be any length at all.
 */
export const MAX_EXCERPT_CHARS = 1200;

/**
 * Below this, there is no prose worth a model's attention.
 *
 * A greeting and a sign-off with nothing between them survives every
 * cut above and reduces to a few characters. Sending it would buy a
 * model call whose whole input was that nothing was said.
 */
export const MIN_EXCERPT_CHARS = 40;

/**
 * What stands in for the excerpt when a record carried no prose.
 *
 * Only reachable under {@link ChunkInput.allowFieldsOnly} — every
 * other path refuses an empty excerpt outright — and deliberately a
 * STATEMENT rather than an empty marker. Emitting the excerpt marker
 * with nothing under it hands a model a header, a heading and then
 * silence, which reads as a truncation or a fetch that failed. The
 * absence is itself the fact, and a model told the record carried no
 * prose can price that in rather than guessing at what it cannot
 * see.
 *
 * Re-authored for the port: the original's named the one kind of
 * record its deployment researched, and this says only what is true
 * of any of them.
 */
export const NO_PROSE_LINE = '(no prose: a fields-only record)';

/** What separates the header from the prose under it. */
const EXCERPT_MARKER = '--- excerpt ---';

/**
 * Characters per token, for the estimate.
 *
 * Rough and deliberately pessimistic. It feeds the ledger and the
 * per-run budget, never a decision that has to be exact.
 */
const CHARS_PER_TOKEN = 4;

/**
 * How far into the allowance a sentence boundary has to fall before
 * a truncation prefers it to a word boundary.
 *
 * A full stop in the first line of a long passage is a worse cut
 * than a word boundary near the ceiling: taking it would throw away
 * most of an allowance that was already paid for.
 */
const SENTENCE_BOUNDARY_SHARE = 0.6;

/** What separates two lines, everywhere in this file. */
const CHUNK_LINE = '\n';

/** What separates two paragraphs, after a collapse. */
const PARAGRAPH_BREAK = '\n\n';

/** What separates a header line's label from its value. */
const LABEL_SEPARATOR = ': ';

/** What a sentence ends with, as a truncation looks for it. */
const SENTENCE_END = '. ';

/** What a word boundary looks like, by the same reading. */
const WORD_BOUNDARY = ' ';

/** Where a link's tracking payload starts, in two spellings. */
const URL_FRAGMENT = '#';

/** The other spelling. */
const URL_QUERY = '?';

// ---------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------

/** Shorter, at the three sites that build a pattern from a code point. */
const charFrom = String.fromCharCode;

/**
 * Every code point that pads a preview line without showing up in
 * it.
 *
 * A preheader packs hundreds of these to stretch what a client shows
 * before the body opens. They are invisible, they survive naive
 * trimming, and they are not free: at four characters to the token
 * they are a bill for nothing.
 *
 * Listed as code points rather than written as a class, for the
 * reason the module header gives about plain-ASCII sources.
 */
const INVISIBLE_CODE_POINTS: readonly number[] = [
  0x00ad, // soft hyphen
  0x034f, // combining grapheme joiner
  0x200b, // zero-width space
  0x200c, // zero-width non-joiner
  0x200d, // zero-width joiner
  0x200e, // left-to-right mark
  0x200f, // right-to-left mark
  0x2028, // line separator
  0x2029, // paragraph separator
  0x202a, // left-to-right embedding
  0x202b, // right-to-left embedding
  0x202c, // pop directional formatting
  0x202d, // left-to-right override
  0x202e, // right-to-left override
  0x2060, // word joiner
  0x2061, // function application
  0x2062, // invisible times
  0x2063, // invisible separator
  0x2064, // invisible plus
  0xfeff, // byte order mark
];

/** The same code points, as the branches of one alternation. */
const INVISIBLE_ALTERNATIVES = INVISIBLE_CODE_POINTS
  .map((code) => charFrom(code))
  .join('|');

/**
 * Every invisible character, in one pass.
 *
 * An alternation rather than a character class, and that is a lint
 * constraint rather than a preference: a class holding a zero-width
 * joiner between two other characters is a misleading class, which
 * is an error here. The two forms match exactly the same single
 * characters, so a replacement through either is the same
 * replacement.
 */
const CHUNK_INVISIBLE = new RegExp(`(?:${INVISIBLE_ALTERNATIVES})`, 'g');

/**
 * The no-break space, which is spaced rather than dropped.
 *
 * It is not invisible — it holds a word apart exactly as a space
 * does — so removing it would join two words that were never one.
 * Built from its code point for the same reason as the roster above.
 */
const CHUNK_NBSP = new RegExp(charFrom(0x00a0), 'g');

/**
 * A stray markup tag.
 *
 * Bounded to 400 characters so a lone opening angle bracket in prose
 * cannot swallow the rest of the body looking for a close.
 */
const CHUNK_TAG = /<[^>]{1,400}>/g;

/** How a plain-text rendering names an inline image. */
const CHUNK_IMAGE = /\[image:[^\]]*\]/gi;

/** How the same rendering names an attached one. */
const CHUNK_CID = /\[cid:[^\]]*\]/gi;

/** A link, up to the first character that cannot be inside one. */
const CHUNK_URL = /(https?:\/\/[^\s<>()]+)/g;

/**
 * The lines that say everything under them belongs to an earlier
 * document rather than to this one.
 *
 * Tested in this order against every line, and the first line that
 * matches any of them ends the document. The last is the header
 * block some clients paste inline when they quote.
 */
const QUOTE_STARTERS: readonly RegExp[] = [
  /^\s*On .{0,120}\bwrote:\s*$/i,
  /^\s*-{2,}\s*Original Message\s*-{2,}\s*$/i,
  /^\s*_{5,}\s*$/,
  /^\s*From:\s.+\s*$/i,
];

/** A line quoted individually, when no marker opened a chain. */
const QUOTED_LINE = /^\s*>/;

/**
 * A copyright line, as a footer opens with one.
 *
 * Built rather than written, because the sign is not an ASCII
 * character and this source stays ASCII. The alternative spelling in
 * parentheses is the original's and is kept: a plain-text rendering
 * writes one or the other.
 */
const FOOTER_COPYRIGHT = new RegExp(
  `^\\s*(${charFrom(0x00a9)}|\\(c\\))\\s*\\d{4}\\b`,
);

/**
 * The lines that open a signature, a disclaimer or an unsubscribe
 * footer.
 *
 * Everything from the first of them onward was added by a sender's
 * client or a sending platform rather than written for this
 * document, so none of it is worth a token. Read on the same terms
 * as {@link QUOTE_STARTERS}: the first line matching any of them
 * ends the document.
 */
const FOOTER_STARTERS: readonly RegExp[] = [
  /^\s*--\s*$/,
  /^\s*Sent from my (iPhone|iPad|Android|mobile)/i,
  /^\s*(CONFIDENTIALITY|DISCLAIMER|PRIVACY)\s*(NOTICE)?\s*:?\s*$/i,
  new RegExp(
    '^\\s*This (e-?mail|message)( and any attachments)? '
    + '(is|are|may be) (confidential|intended)',
    'i',
  ),
  /^\s*If you (no longer wish|would prefer not|do not wish) to receive/i,
  /^\s*(To )?[Uu]nsubscribe\b/,
  /^\s*You are receiving this/i,
  /^\s*This email was intended for/i,
  FOOTER_COPYRIGHT,
];

/** The openings a prose window starts after. */
const GREETING_WORDS = [
  'hi',
  'hey',
  'hello',
  'dear',
  'good (morning|afternoon|evening)',
].join('|');

/**
 * A greeting line.
 *
 * Bounded to sixty characters after the word so a sentence that
 * merely opens with one of them is not mistaken for a greeting.
 */
const GREETING = new RegExp(
  `^\\s*(${GREETING_WORDS})\\b[^\\n]{0,60}$`,
  'i',
);

/** The closings a prose window stops before. */
const SIGNOFF_WORDS = [
  'best',
  'best regards',
  'kind regards',
  'regards',
  'thanks',
  'thank you',
  'cheers',
  'sincerely',
  'all the best',
  'warm regards',
].join('|');

/**
 * A sign-off line: one of the closings, alone on its line.
 *
 * The longer spellings sit after the shorter ones they open with,
 * which is the original's order and matters: the engine tries `best`
 * first, fails at the end anchor on `best regards`, and backtracks
 * into the longer branch. Reordering them would change nothing;
 * dropping either would.
 */
const SIGNOFF = new RegExp(`^\\s*(${SIGNOFF_WORDS})\\b[,.!]?\\s*$`, 'i');

/**
 * How far into a document a greeting is still a greeting.
 *
 * Past this many lines it is a word in a sentence, and taking it as
 * an opening would throw away everything above it.
 */
const GREETING_SEARCH_LINES = 12;

/** A line break, in either spelling, as a split reads it. */
const LINE_BREAK = /\r?\n/;

/** A run of spaces or tabs. */
const SPACE_RUN = /[ \t]+/g;

/** Trailing spaces, immediately before a line break. */
const SPACE_BEFORE_BREAK = / *\n/g;

/** Three or more line breaks: more blank lines than a paragraph. */
const BLANK_LINE_RUN = /\n{3,}/g;

/** Whitespace at the end of a truncated passage. */
const TRAILING_SPACE = /\s+$/;

/** Any run of whitespace at all, including line breaks. */
const WHITESPACE_RUN = /\s+/g;

// ---------------------------------------------------------------------------
// What a caller declares, and what comes back
// ---------------------------------------------------------------------------

/**
 * One header field: where its value is read from, what the line
 * calls it, and what the line says when nothing resolved.
 *
 * A roster of these is derived from a domain's field contract, for
 * the reason the module header gives. Every member is checked before
 * a header is assembled, so a misdeclared entry refuses the chunk
 * rather than producing a line a model cannot read.
 */
export interface ChunkField {
  /**
   * The key this field is read under in {@link ChunkInput.values}.
   *
   * The same name the domain's field contract declares and a
   * finding's payload fills in, so a roster is derived from a
   * contract rather than mapped onto one.
   */
  readonly key: string;

  /**
   * What the header line calls this field. Absent means
   * {@link key}.
   *
   * Separate from the key because a label is spent on every call: a
   * contract naming a field at length can label it briefly without
   * renaming anything, which the original did for one of its own
   * six.
   */
  readonly label?: string;

  /**
   * What the line carries when the value resolved to nothing.
   *
   * Required, and for the reason {@link NO_PROSE_LINE} exists: a
   * bare label with nothing after it reads to a model as a
   * truncation, where a stand-in says that the field was looked for
   * and not found.
   */
  readonly fallback: string;

  /**
   * Whether a resolved value here is enough to make a fields-only
   * chunk worth a call.
   *
   * A domain declares which of its fields identify the thing being
   * described. Under {@link ChunkInput.allowFieldsOnly} a chunk
   * where none of them resolved is refused, because asking a model
   * to read it would be asking it to guess.
   */
  readonly identifying?: boolean;
}

/**
 * Everything {@link buildChunk} is given.
 *
 * The type is a compile-time claim and nothing more: this module is
 * spliced into a Code node where no compiler ran, so every member is
 * read defensively whatever the annotation says.
 */
export interface ChunkInput {
  /**
   * The header roster, in the order the header writes it.
   *
   * Anything that is not a list is no roster at all, which under
   * {@link allowFieldsOnly} is itself a refusal.
   */
  readonly fields?: readonly ChunkField[];

  /**
   * The resolved values, by field name.
   *
   * A finding's `fields` payload, or whatever the deterministic
   * layer worked out on the way to one. Read with an own-property
   * check, so a payload carrying a key named for a prototype member
   * cannot hand a function back as though a field had resolved to
   * it.
   */
  readonly values?: Readonly<Record<string, unknown>>;

  /**
   * The document body, before any of it is thrown away.
   *
   * Anything at all: this is the value that arrived from outside,
   * and the whole file exists to stop it reaching a model as it is.
   */
  readonly body?: unknown;

  /**
   * Whether a record with no prose at all may still become a chunk.
   *
   * Some records are a set of resolved fields and nothing else.
   * Reading one is still worth a call, and the chunk is tiny.
   * Without this flag such a record is refused as carrying no prose,
   * which is right when the prose is the point and wrong when the
   * fields are.
   *
   * It relaxes the PROSE minimum and nothing else. Every ceiling
   * still applies, and it can never turn a body into a payload.
   */
  readonly allowFieldsOnly?: boolean;
}

/** What one cut took out, so a spend stays explainable. */
export interface ChunkRemoval {
  /** Lines belonging to an earlier document. */
  readonly quoted_lines: number;

  /** Lines belonging to a signature or a footer. */
  readonly footer_lines: number;

  /** How long the body was before any of this ran. */
  readonly chars_before: number;

  /** How long the excerpt was after all of it. */
  readonly chars_after: number;

  /** Whether the excerpt hit {@link MAX_EXCERPT_CHARS}. */
  readonly truncated: boolean;
}

/** A body reduced to prose worth reading, and what that took. */
export interface ChunkExcerpt {
  /** The prose, bounded by {@link MAX_EXCERPT_CHARS}. */
  readonly excerpt: string;

  /** What the reduction removed on the way. */
  readonly removed: ChunkRemoval;
}

/** What a quoted-chain cut left, and how much it took. */
export interface QuotedChainCut {
  /** Everything before the chain. */
  readonly text: string;

  /** How many lines the chain held. */
  readonly quoted_lines: number;
}

/** What a signature cut left, and how much it took. */
export interface SignatureFooterCut {
  /** Everything before the signature. */
  readonly text: string;

  /** How many lines the signature and footer held. */
  readonly footer_lines: number;
}

/** A passage after a ceiling was applied to it. */
export interface TruncatedText {
  /** The passage, at or under the ceiling. */
  readonly text: string;

  /** Whether the ceiling was reached. */
  readonly truncated: boolean;
}

/**
 * The one payload a model may receive, and everything a caller needs
 * to decide whether to send it.
 *
 * `usable: false` means DO NOT CALL A MODEL. Route it to review.
 * There is no third option and no fallback to the body.
 */
export interface ChunkResult {
  /** The chunk, or the empty string when it was refused. */
  readonly chunk: string;

  /** Whether {@link chunk} may be sent. */
  readonly usable: boolean;

  /** Why it may not be, or the empty string when it may. */
  readonly reason: string;

  /** How long the chunk is. Zero when it was refused. */
  readonly chars: number;

  /**
   * How long the excerpt was, whether or not the chunk was refused.
   *
   * Reported for a refusal too, because it is usually what the
   * refusal was about.
   */
  readonly excerpt_chars: number;

  /** What {@link chars} is expected to cost. Zero when refused. */
  readonly estimated_tokens: number;

  /**
   * Whether anything was cut to fit a ceiling.
   *
   * True when EITHER the excerpt hit
   * {@link MAX_EXCERPT_CHARS} or the assembled chunk hit
   * {@link MAX_CHUNK_CHARS}. {@link removed} separates the two.
   */
  readonly truncated: boolean;

  /** What the reduction removed. */
  readonly removed: ChunkRemoval;
}

// ---------------------------------------------------------------------------
// Refusals
// ---------------------------------------------------------------------------

/**
 * Every reason a chunk comes back unusable, except the one that
 * names a roster position.
 *
 * Fixed sentences rather than assembled ones, because a caller
 * routing refusals to review groups them by this string.
 *
 * Not exported, deliberately. The closed roster of all four belongs
 * in the suite, declared there and held set-equal against what the
 * cases actually produce — a suite reading the sentences off this
 * object would agree with any edit to them, where one declaring them
 * fails naming a sentence nothing reaches and a sentence nothing
 * registered.
 */
const CHUNK_REASONS = {
  /** The body reduced to nothing at all. */
  noProse: 'no prose survived boilerplate removal',

  /** It reduced to less than {@link MIN_EXCERPT_CHARS}. */
  shortProse: 'prose too short to be meaningful',

  /** Fields-only, and nothing identifying resolved. */
  noFields: 'no resolved fields and no prose',
} as const;

/**
 * The roster refusal, naming the entry that could not be used.
 *
 * By position rather than by name, because the two faults it covers
 * are an entry that is not a record at all — which has no name to
 * report — and one whose label or stand-in text is empty. An index
 * addresses both, and it addresses the list the caller passed rather
 * than the contract it was derived from.
 *
 * @param index - Where the entry sits in the roster.
 * @returns The reason, as a caller reads it.
 */
function unusableEntry(index: number): string {
  return `unusable field roster entry at index ${index}`;
}

// ---------------------------------------------------------------------------
// Reading a value
// ---------------------------------------------------------------------------

/**
 * Whatever a caller had, as text.
 *
 * Absence becomes the empty string and everything else is converted,
 * which is the original's reading and the reason nothing below has
 * to guard its own argument.
 *
 * The conversion can itself raise, on ONE kind of value: an object
 * whose own conversion throws. A symbol is not one of them, which is
 * worth writing down because it reads as though it should be —
 * `String()` called as a function special-cases a symbol and answers
 * its description, where a template or a concatenation would refuse
 * it. Measured rather than reasoned, and pinned in
 * `tests/lib/chunk.test.ts`.
 *
 * That exposure is the original's and it is kept. It is also the one
 * way anything here raises at all — every refusal this module
 * decides is RETURNED, never thrown.
 *
 * @param value - Anything at all, including nothing.
 * @returns The text, or the empty string.
 */
function asText(value: unknown): string {
  return value === null || value === undefined
    ? ''
    : String(value);
}

/**
 * Whether a value can be read by key at all.
 *
 * A list is excluded, because indexing one by a field name answers
 * nothing and a roster passed where a payload belonged should read
 * as no payload rather than as an empty one.
 *
 * @param value - Anything at all.
 * @returns Whether it is a plain keyed object.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object'
    && value !== null
    && !Array.isArray(value);
}

/**
 * Everything before the first occurrence of a marker.
 *
 * The value the original's split-and-take-the-first produced,
 * written as a search so an index read cannot come back undefined.
 *
 * @param text - What to cut.
 * @param marker - What to cut at.
 * @returns Everything before it, or the whole text.
 */
function beforeFirst(text: string, marker: string): string {
  const at = text.indexOf(marker);

  return at === -1
    ? text
    : text.slice(0, at);
}

// ---------------------------------------------------------------------------
// The estimate
// ---------------------------------------------------------------------------

/**
 * What a passage is expected to cost, in tokens.
 *
 * Rough and deliberately pessimistic — see {@link CHARS_PER_TOKEN}.
 * It feeds the ledger and the per-run budget, never a decision that
 * has to be exact, and it is pessimistic on purpose: a budget that
 * over-estimates stops early, where one that under-estimates stops
 * after the money is gone.
 *
 * A number is taken as a CHARACTER COUNT and anything else as text
 * to measure, so a caller holding a passage and a caller holding its
 * length get the same answer without either converting first. A
 * number that is not a count passes straight through the
 * arithmetic — `NaN` characters estimate as `NaN` tokens, which is
 * visibly nothing rather than a plausible zero.
 *
 * @param chars - A character count, or text to measure.
 * @returns The estimate, rounded up.
 */
export function estimateTokens(chars: unknown): number {
  const count = typeof chars === 'number'
    ? chars
    : asText(chars).length;

  return Math.ceil(count / CHARS_PER_TOKEN);
}

// ---------------------------------------------------------------------------
// The cuts
// ---------------------------------------------------------------------------

/**
 * A passage with its invisible padding gone.
 *
 * The characters in {@link INVISIBLE_CODE_POINTS} are removed
 * outright; the no-break space becomes an ordinary one instead,
 * because it holds words apart and dropping it would join two that
 * were never one.
 *
 * @param text - Anything at all.
 * @returns The passage, without what could not be seen.
 */
export function stripInvisibleRuns(text: unknown): string {
  return asText(text)
    .replace(CHUNK_INVISIBLE, '')
    .replace(CHUNK_NBSP, ' ');
}

/**
 * A passage with its markup leftovers gone.
 *
 * Tags become a space rather than nothing, so two words a tag sat
 * between do not run together. The two placeholder forms are how a
 * plain-text rendering names an image it could not include: they
 * describe an attachment nobody will read and cost tokens to say so.
 *
 * @param text - Anything at all.
 * @returns The passage, as prose.
 */
export function stripMarkup(text: unknown): string {
  return asText(text)
    .replace(CHUNK_TAG, ' ')
    .replace(CHUNK_IMAGE, ' ')
    .replace(CHUNK_CID, ' ');
}

/**
 * A passage whose links carry an address and no tracking payload.
 *
 * The path is kept so the link is still recognisable and still
 * says where it pointed; everything from the first query or
 * fragment marker is dropped. This is the single largest saving in
 * the file — a tracked link is mostly parameters, and every one of
 * them is billed as input.
 *
 * @param text - Anything at all.
 * @returns The passage, with its links reduced to addresses.
 */
export function stripUrlTracking(text: unknown): string {
  return asText(text).replace(CHUNK_URL, (url) => {
    const addressed = beforeFirst(url, URL_FRAGMENT);

    return beforeFirst(addressed, URL_QUERY);
  });
}

/**
 * A passage with everything belonging to an earlier document cut
 * off.
 *
 * Two readings, and the second is the fallback. When any line
 * matches {@link QUOTE_STARTERS}, that line and everything under it
 * is a previous document and the cut is made there. When no line
 * does, quoted lines are dropped one at a time instead — which
 * catches a chain that was pasted without a marker, at the cost of
 * keeping any interleaved reply.
 *
 * The count reports lines rather than characters because that is
 * what the two readings have in common.
 *
 * @param text - Anything at all.
 * @returns What is left, and how many lines went.
 */
export function cutQuotedChain(text: unknown): QuotedChainCut {
  const lines = asText(text).split(LINE_BREAK);

  for (const [index, line] of lines.entries()) {
    if (QUOTE_STARTERS.some((starter) => starter.test(line))) {
      return {
        text: lines.slice(0, index).join(CHUNK_LINE),
        quoted_lines: lines.length - index,
      };
    }
  }

  const kept: string[] = [];
  let quoted = 0;

  for (const line of lines) {
    if (QUOTED_LINE.test(line)) {
      quoted += 1;
    } else {
      kept.push(line);
    }
  }

  return { text: kept.join(CHUNK_LINE), quoted_lines: quoted };
}

/**
 * A passage with its signature, disclaimer and unsubscribe footer
 * cut off.
 *
 * One reading rather than two: the first line matching
 * {@link FOOTER_STARTERS} ends the document, and everything under it
 * goes. There is no per-line fallback here, because a footer is
 * contiguous by construction — it is appended, where a quoted chain
 * can be interleaved.
 *
 * @param text - Anything at all.
 * @returns What is left, and how many lines went.
 */
export function cutSignatureFooter(text: unknown): SignatureFooterCut {
  const lines = asText(text).split(LINE_BREAK);

  for (const [index, line] of lines.entries()) {
    if (FOOTER_STARTERS.some((starter) => starter.test(line))) {
      return {
        text: lines.slice(0, index).join(CHUNK_LINE),
        footer_lines: lines.length - index,
      };
    }
  }

  return { text: lines.join(CHUNK_LINE), footer_lines: 0 };
}

/**
 * The part of a passage a person actually wrote.
 *
 * Between a greeting and a sign-off is the content; the two anchors
 * are courtesies. Both are optional and independent — a passage
 * carrying neither is used whole, and one carrying only a sign-off
 * is cut only at the end.
 *
 * A greeting is looked for in the first {@link GREETING_SEARCH_LINES}
 * lines alone, because past that it is a word in a sentence and
 * taking it as an opening would throw away everything above it. The
 * sign-off is looked for from the end, so the LAST one wins: a
 * passage quoting a closing mid-way is still cut at its own.
 *
 * @param text - Anything at all.
 * @returns The window between the anchors.
 */
export function proseWindow(text: unknown): string {
  const lines = asText(text).split(LINE_BREAK);
  let start = 0;
  let end = lines.length;

  for (const [index, line] of lines.entries()) {
    if (index >= GREETING_SEARCH_LINES) {
      break;
    }

    if (GREETING.test(line)) {
      start = index + 1;
      break;
    }
  }

  for (let index = lines.length - 1; index > start; index -= 1) {
    if (SIGNOFF.test(lines[index] ?? '')) {
      end = index;
      break;
    }
  }

  return lines.slice(start, end).join(CHUNK_LINE);
}

// ---------------------------------------------------------------------------
// Whitespace and ceilings
// ---------------------------------------------------------------------------

/**
 * A passage with its whitespace collapsed, paragraphs intact.
 *
 * Runs of spaces and tabs become one space, trailing spaces before a
 * line break go, and three or more line breaks become two. What
 * survives is the paragraph structure and nothing else: whitespace
 * is billed like any other character, and a passage indented for a
 * reader is paying for the indentation.
 *
 * Line breaks are DELIBERATELY not collapsed. The excerpt is prose a
 * model reads, and its paragraphs are part of what it says.
 *
 * @param text - Anything at all.
 * @returns The passage, collapsed.
 */
export function collapseWhitespace(text: unknown): string {
  return asText(text)
    .replace(SPACE_RUN, ' ')
    .replace(SPACE_BEFORE_BREAK, CHUNK_LINE)
    .replace(BLANK_LINE_RUN, PARAGRAPH_BREAK)
    .trim();
}

/**
 * A value as ONE line: every run of whitespace, line breaks
 * included, collapsed to a single space.
 *
 * This is the header's collapse and it is not
 * {@link collapseWhitespace}. A header line is one line by
 * definition — the format is label, separator, value, break — so a
 * value carrying a break would open a line of its own, and a line of
 * its own is something a model reads as another field or as the
 * excerpt marker. The original collapsed header values with the
 * paragraph-preserving pass, which is the divergence
 * {@link buildChunk} writes up.
 *
 * @param value - Anything at all.
 * @returns The value on one line, or the empty string.
 */
function collapseToLine(value: unknown): string {
  return asText(value)
    .replace(WHITESPACE_RUN, ' ')
    .trim();
}

/**
 * A passage cut to a ceiling, on a boundary rather than mid-word.
 *
 * A model handed a severed word reads a fact that was never
 * written, so the cut is moved back to the last sentence or word
 * boundary inside the allowance. The sentence boundary is preferred
 * only when it falls past {@link SENTENCE_BOUNDARY_SHARE} of the
 * allowance: a full stop in the first line of a long passage is a
 * worse cut than a word boundary near the ceiling, because taking it
 * would throw away most of an allowance already paid for. With
 * neither available the cut is hard, which is the ceiling winning
 * over the courtesy.
 *
 * A NEGATIVE limit reads as an offset from the END, because the cut
 * is a slice rather than a check. Unreachable from this file, whose
 * two call sites pass ceilings; it is what a caller of the export
 * would meet, and it is the original's.
 *
 * @param text - Anything at all.
 * @param limit - The ceiling, in characters.
 * @returns The passage, and whether the ceiling was reached.
 */
export function truncateOnBoundary(
  text: unknown,
  limit: number,
): TruncatedText {
  const source = asText(text);

  if (source.length <= limit) {
    return { text: source, truncated: false };
  }

  const cut = source.slice(0, limit);
  const sentence = cut.lastIndexOf(SENTENCE_END);
  const space = cut.lastIndexOf(WORD_BOUNDARY);
  let at = limit;

  if (sentence > limit * SENTENCE_BOUNDARY_SHARE) {
    at = sentence + 1;
  } else if (space > 0) {
    at = space;
  }

  return {
    text: cut.slice(0, at).replace(TRAILING_SPACE, ''),
    truncated: true,
  };
}

// ---------------------------------------------------------------------------
// The excerpt
// ---------------------------------------------------------------------------

/**
 * A document body reduced to the prose worth reading, and a record
 * of what that took.
 *
 * The order of the passes is load-bearing rather than incidental.
 * The invisible strip runs first, because padding characters sit
 * inside the markers every later pass matches on. The markup strip
 * runs before the link strip, so a link inside a tag is gone rather
 * than reduced. The quoted-chain cut runs before the signature cut,
 * because a quoted chain carries the earlier document's signature
 * inside it and cutting the chain takes both. The prose window runs
 * last of the cuts, on what is left. Then the collapse, then the
 * ceiling.
 *
 * The report is the audit half. `chars_before` is measured on what
 * arrived and `chars_after` on what survived, so a spend is always
 * explainable afterwards — including a spend on a document that
 * turned out to be almost entirely boilerplate, which is the
 * interesting case and the one nobody would think to look at.
 *
 * @param body - The document body, or anything at all.
 * @returns The excerpt, and what was removed to get it.
 */
export function buildExcerpt(body: unknown): ChunkExcerpt {
  const original = asText(body);
  const visible = stripInvisibleRuns(original);
  const plain = stripMarkup(visible);
  const untracked = stripUrlTracking(plain);
  const quoted = cutQuotedChain(untracked);
  const footer = cutSignatureFooter(quoted.text);
  const windowed = proseWindow(footer.text);
  const cleaned = collapseWhitespace(windowed);
  const cut = truncateOnBoundary(cleaned, MAX_EXCERPT_CHARS);

  return {
    excerpt: cut.text,
    removed: {
      quoted_lines: quoted.quoted_lines,
      footer_lines: footer.footer_lines,
      chars_before: original.length,
      chars_after: cut.text.length,
      truncated: cut.truncated,
    },
  };
}

// ---------------------------------------------------------------------------
// The chunk
// ---------------------------------------------------------------------------

/** What a header assembly answers: the lines, or why there are none. */
interface HeaderBuild {
  /** Every header line, joined. Empty when the roster was. */
  readonly text: string;

  /** Whether any field declared identifying resolved to a value. */
  readonly identified: boolean;

  /** Why the roster could not be used, or the empty string. */
  readonly fault: string;
}

/**
 * The header, assembled from a roster and the values it names.
 *
 * One line per roster entry, in roster order, each carrying its
 * label and either its resolved value or its stand-in text. A caller
 * reading the result cannot tell which of the two a line holds, and
 * that is deliberate: the model is being told what is known and what
 * is not, in the same shape either way.
 *
 * Two things are checked per entry, and both are about what the
 * entry can DO rather than what it says. An entry that is not a
 * record has no label to write, and an entry whose label or stand-in
 * text collapses to nothing would write a line a model reads as a
 * truncation. Either refuses the whole chunk, because a header
 * missing a field is a header that quietly says something false.
 *
 * A value is read with an own-property check. A payload arriving as
 * JSON can carry a key named for a prototype member, and a plain
 * index read would answer a function inherited from the prototype as
 * though a field had resolved to it — which would put the text of a
 * built-in method into a model prompt and mark the record
 * identified.
 *
 * @param fields - The roster, or anything at all.
 * @param values - The payload the roster names, or anything at all.
 * @returns The lines, or the fault that stopped them.
 */
function buildHeader(fields: unknown, values: unknown): HeaderBuild {
  const roster: readonly unknown[] = Array.isArray(fields)
    ? fields
    : [];
  const source: Readonly<Record<string, unknown>> = isRecord(values)
    ? values
    : {};
  const lines: string[] = [];
  let identified = false;

  for (const [index, entry] of roster.entries()) {
    if (!isRecord(entry)) {
      return { text: '', identified: false, fault: unusableEntry(index) };
    }

    const label = collapseToLine(entry.label ?? entry.key);
    const fallback = collapseToLine(entry.fallback);

    if (label === '' || fallback === '') {
      return { text: '', identified: false, fault: unusableEntry(index) };
    }

    const key = asText(entry.key);
    const held: unknown = Object.hasOwn(source, key)
      ? source[key]
      : undefined;
    const value = collapseToLine(held);

    if (value !== '' && entry.identifying === true) {
      identified = true;
    }

    lines.push(`${label}${LABEL_SEPARATOR}${value || fallback}`);
  }

  return { text: lines.join(CHUNK_LINE), identified, fault: '' };
}

/**
 * Assemble the one payload a model may receive.
 *
 * The shape is a header of resolved fields, then either the excerpt
 * marker and the prose under it or {@link NO_PROSE_LINE}. A roster
 * that was empty produces the prose part alone rather than a leading
 * blank line, which is the one place the assembly differs from the
 * original's — the original always had six fields to write.
 *
 * ## What refusal means
 *
 * `usable: false` means DO NOT CALL A MODEL. Route the record to
 * review. There is no third option and no fallback to the body: the
 * whole file exists because sending the body when the reduction
 * failed is how an unbounded body reaches a model, and a fallback
 * here would be that path with a different name on it.
 *
 * Four things refuse, and they are checked in this order. An
 * unusable roster entry comes first, because a header assembled from
 * a broken roster would make every reading under it meaningless.
 * Then, when prose is required, an excerpt that came back empty and
 * one that came back shorter than {@link MIN_EXCERPT_CHARS}. And
 * under {@link ChunkInput.allowFieldsOnly}, a record where nothing
 * declared identifying resolved — a record with no prose and nothing
 * that names it is not worth a call, and asking a model to read it
 * would be asking it to guess.
 *
 * Note what is NOT checked: a record carrying prose is usable with
 * no resolved fields at all. That is the original's, and it is
 * right — the prose is the thing being read, and the fields are what
 * saved a model from re-deriving it.
 *
 * ## The ceiling
 *
 * {@link MAX_CHUNK_CHARS} is applied to the assembled chunk as the
 * last step, whatever happened above it. Belt and braces on purpose:
 * the header is bounded by its roster and the excerpt by its own
 * ceiling, so the assembly should already be inside it — and this
 * step is what makes that a guarantee rather than a property of the
 * current arithmetic. No later edit to a roster, a stand-in text or
 * an excerpt ceiling can widen it by accident.
 *
 * ## The one behavioural divergence
 *
 * A header value is collapsed to ONE LINE here, where the original
 * collapsed it with the paragraph-preserving pass. The chunk is a
 * line-anchored format: a model reads `label: value` per line, then
 * a marker line, then prose. A resolved value carrying a line break
 * therefore opens a line of its own, and a line of its own can be
 * read as another field — or as the excerpt marker, which is the
 * interesting one, since the value came out of a document written by
 * somebody else.
 *
 * The original's fields were resolved from a narrower source and its
 * header was six fixed lines, so the exposure was smaller and the
 * argument for spending a pass on it was weaker. Here the roster is
 * a domain's and the values are whatever the deterministic layer
 * resolved out of a fetched document, so a header line is one line
 * by construction rather than by convention. Nothing else in the
 * reduction moves.
 *
 * This is outside the parity leg by construction — the header comes
 * from a roster the original does not have — so the characterization
 * cases in `tests/lib/chunk.test.ts` are what pin it, and the
 * injected words survive verbatim while the form that would have
 * been active does not.
 *
 * @param input - The roster, the values, the body and the flag.
 * @returns The chunk and its measurements, or the refusal.
 */
export function buildChunk(input: ChunkInput): ChunkResult {
  const built = buildExcerpt(input?.body);
  const excerpt = built.excerpt;
  const header = buildHeader(input?.fields, input?.values);
  const fieldsOnly = input?.allowFieldsOnly === true;
  let reason = header.fault;

  if (reason === '') {
    if (!fieldsOnly && excerpt === '') {
      reason = CHUNK_REASONS.noProse;
    } else if (!fieldsOnly && excerpt.length < MIN_EXCERPT_CHARS) {
      reason = CHUNK_REASONS.shortProse;
    } else if (fieldsOnly && !header.identified) {
      reason = CHUNK_REASONS.noFields;
    }
  }

  const prose = excerpt !== ''
    ? [EXCERPT_MARKER, excerpt].join(CHUNK_LINE)
    : NO_PROSE_LINE;
  const parts = header.text !== ''
    ? [header.text, prose]
    : [prose];
  const assembled = parts.join(CHUNK_LINE);
  const capped = truncateOnBoundary(assembled, MAX_CHUNK_CHARS);
  const refused = reason !== '';
  const chunk = refused
    ? ''
    : capped.text;

  return {
    chunk,
    usable: !refused,
    reason,
    // Both are measurements of `chunk`, which is why neither is
    // special-cased for a refusal: a refused chunk IS the empty
    // string, so its length and its estimate are measured zeros
    // rather than unmeasured quantities wearing one.
    chars: chunk.length,
    excerpt_chars: excerpt.length,
    estimated_tokens: estimateTokens(chunk.length),
    truncated: built.removed.truncated || capped.truncated,
    removed: built.removed,
  };
}
