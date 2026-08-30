/**
 * @packageDocumentation
 * validate-entity-name — the deterministic gate in front of the one
 * pipeline step that gets tools bound, and the reason it bounds
 * CAPABILITY rather than content.
 *
 * A research step is handed a name that somebody else's text
 * produced: a model read a document and answered with what it
 * decided the document is about. That answer is then interpolated
 * into a search query and into a line of a prompt for an agent
 * that can make outbound requests. This module is the only thing
 * standing between those two facts, and it is plain code rather
 * than a model judging another model's output on purpose — asking
 * a model whether a string is safe to hand to a model with tools
 * is not a control.
 *
 * ## The rule this file exists for
 *
 * WHAT THE GATE BOUNDS IS CAPABILITY, NOT CONTENT.
 *
 * A validated name reaches exactly two places: the query part of a
 * request whose host was fixed before the pipeline ran, and a line
 * of a prompt. It reaches no shell, no filesystem path and no host
 * part of any URL. So the question this file answers is not "does
 * this name look hostile?" but "could this name change the SHAPE
 * of a request or of a prompt line?" — a scheme, an address, a
 * line break, a template opener, a markup delimiter.
 *
 * AN INSTRUCTION-SHAPED NAME PASSES, and that is a decision rather
 * than an oversight. A name reading like an order to the agent is
 * accepted, because by the time it is validated it is only ever a
 * SEARCH TERM: at worst the agent searches for a silly phrase, and
 * nothing it can be told makes it fetch somebody else's host,
 * because a name never reaches a host. Rejecting on how
 * instruction-like a name reads would be an unwinnable content
 * filter that also drops real entities, and it would leave the
 * next phrasing nobody thought of. What such a name does when it
 * is DISPLAYED is a different rule at a different layer, and
 * `sanitize-md.ts` is where that one lives.
 *
 * IT FAILS CLOSED. A character nobody listed is a rejection and
 * not a pass, so widening the gate is a deliberate edit to the
 * allowlist rather than something an unfamiliar script achieves by
 * turning up.
 *
 * IT ALSO FAILS NON-FATALLY. A rejection is a value, never a
 * throw: the caller drops the research step and the record is
 * rendered without it. A gate that raised would turn one bad
 * extraction into a failed run, which is a denial of service
 * available to anybody who can get a document in front of the
 * pipeline — and a run that fails is a run an operator is tempted
 * to rerun with the check off.
 *
 * ## The four checks, and why their order is the design
 *
 * {@link validateEntityName} answers on the first check that
 * refuses, so the order fixes which reason a value that fails
 * several of them reports.
 *
 * 1. THE REQUEST-SHAPE DENYLIST, ON THE RAW VALUE, BEFORE ANY
 *    WHITESPACE NORMALIZATION. This is the most load-bearing line
 *    in the file. Collapsing whitespace first would fold a value
 *    carrying a line break into one plausible-looking line and let
 *    the smuggled second line through as though the extractor had
 *    written it. Every shape the denylist names is outside the
 *    allowlist anyway; they are named separately so a rejection
 *    says WHY, and so the intent survives any later widening of
 *    the charset.
 * 2. THE LENGTH CAP, on the trimmed value. An extraction that has
 *    turned into a payload is not a name whatever it holds, and
 *    the cap is the backstop for a payload that carries no shape
 *    from the first check.
 * 3. THE EXTRACTION NON-ANSWERS, on the normalized value. A model
 *    that found no name says so in words; researching those words
 *    would spend a request on a placeholder.
 * 4. THE CHARACTER ALLOWLIST, last. Letters and digits in any
 *    script plus the punctuation that appears in real entity
 *    names, and nothing else — a slash, a question mark, an equals
 *    sign, a colon and a hash are all out.
 *
 * ## What this port takes as input, and why
 *
 * THE NON-ANSWER ROSTER IS AN ARGUMENT, with the ported list as
 * its default in {@link ENTITY_NON_ANSWERS}. It is the one piece
 * of this gate that is about what a particular extractor SAYS
 * rather than about what a request can be made to do, and this
 * platform runs a domain's own vocabulary in from stored rows
 * rather than baking it into a library.
 *
 * The default carries the ported words rather than being empty
 * because they are extraction-shaped and not domain-shaped: they
 * are what a model answers when the document named nothing, which
 * is a property of asking a model for a name at all. A domain
 * whose extractions answer something else passes its own roster,
 * and passing an empty one turns the check off — which is
 * legitimate, because a non-answer is a waste of a request rather
 * than a hazard.
 *
 * THE CAP, THE DENYLIST AND THE ALLOWLIST ARE NOT ARGUMENTS, and
 * that asymmetry is the point rather than an omission. Those three
 * ARE the capability bound; a gate whose bound is a parameter is a
 * gate any call site can widen, and the one call site that matters
 * is downstream of text this platform did not write. The two
 * patterns are not exported either, for a smaller version of the
 * same reason: a `RegExp` is a mutable object and
 * `RegExp.prototype.compile` rewrites one in place, so an exported
 * pattern is a bound a caller can edit at run time.
 * {@link MAX_ENTITY_NAME_LENGTH} is exported because a number
 * cannot be edited that way and a caller that wants to say what
 * the cap is should not have to guess it.
 *
 * ## What is kept
 *
 * The cap, what both patterns match, the non-answer roster, the
 * order the four checks run in, the whole-value comparison the
 * non-answer check makes, the trim, the whitespace collapse, the
 * refusal to coerce a non-string, and the shape of both answers —
 * including that a rejection carries no name key at all.
 *
 * `tests/parity/validate-entity-name.parity.test.ts` is what says
 * so rather than this paragraph. Its leg is FULL: the original
 * exports one function, this port's default call is compared
 * against it directly, and both sides are driven over the neutral
 * injection corpus. What that leg cannot reach is the roster
 * parameter, which the original has no equivalent for, so the
 * cases in `tests/lib/validate-entity-name.test.ts` are the whole
 * record of what a caller-supplied roster does.
 *
 * ## What is dropped
 *
 * The subject matter, entirely: the original gated one kind of
 * entity for one deployment, and neither the kind nor the
 * deployment appears here — a search of this file says nothing
 * about what any domain researches. The guarded CommonJS export
 * block at the foot of the original becomes declaration exports,
 * which is what the splice strips and what a Code node can run,
 * and `var` becomes `const`. The whitespace pattern the original
 * wrote inline is a named constant beside the two it already
 * declared, which moves nothing: it is used through
 * `String.prototype.replace`, and that method resets a global
 * pattern's cursor before it starts.
 *
 * One character of the allowlist goes with them, and it is the
 * only edit to either pattern: the original escapes the hyphen
 * that ends its character class, where an escape is unnecessary
 * because a hyphen in that position cannot open a range.
 * `no-useless-escape` is an error in this package and reports it,
 * so the backslash is gone and the set the class matches is
 * unchanged — which is the reading the parity leg takes, since
 * neither pattern is exported and nothing compares their sources.
 *
 * ## What is preserved deliberately
 *
 * Six readings that look like faults until the argument is read.
 * The first five have a case of their own in
 * `tests/lib/validate-entity-name.test.ts`. The sixth is a
 * spelling rather than a behaviour and has none, which is said
 * where it is claimed rather than left for a reader to notice.
 *
 * A REASON NAMES THE CHECK THAT RAN FIRST, not the worst thing
 * about the value. An oversize payload carrying a scheme reports
 * the scheme, and a non-answer spelt with a character the
 * allowlist refuses reports the non-answer. Reasons are a
 * diagnostic for whoever reads the log, and reordering them to
 * rank hazards would change which one a caller sees for every
 * value that fails twice.
 *
 * A NON-STRING IS `empty` RATHER THAN A KIND OF ITS OWN. A parser
 * hiccup can hand this a number, an object or an array, and none
 * of them is coerced: converting an array of one string produces
 * that string, which would smuggle a value past a check that
 * never saw it as text.
 *
 * THE CAP IS MEASURED BEFORE THE COLLAPSE, on the trimmed value.
 * So a value whose internal whitespace would have brought it under
 * the cap is still refused, and an accepted name can come back
 * shorter than the value the cap measured.
 *
 * ONLY THE WHOLE VALUE IS A NON-ANSWER. A name that merely
 * CONTAINS one of the roster words is a plausible real name and is
 * accepted; the comparison is against the whole normalized value,
 * lowercased.
 *
 * THE INVISIBLE CHARACTERS SPLIT TWO WAYS, and neither half was
 * chosen — both fall out of the same two patterns. A no-break
 * space is matched by the whitespace class, so it collapses to an
 * ordinary space and the name survives. A zero-width space is not
 * matched by it and is not in the allowlist either, so it is an
 * invalid character. Anything that strips invisible characters
 * belongs upstream of this gate rather than inside it.
 *
 * ONE PATTERN CARRIES THE UNICODE FLAG AND THE OTHER DOES NOT.
 * That is the original's spelling. The allowlist needs the flag
 * for its script-wide letter and number classes; the denylist is
 * ASCII throughout, so adding it there would move no answer, and
 * it is not added because a change that no case and no comparison
 * can report is a change nothing would catch if it were wrong.
 * That is also why this one has no case: there is no input the
 * two spellings answer differently over, so the sentence is the
 * only artifact there can be.
 *
 * ## Dual context
 *
 * Like every module under `src/lib/`, this one is imported by the
 * default suite AND spliced into a workflow Code node body by
 * `scripts/build-workflows.ts`. So it imports nothing, keeps no
 * state between calls, and cannot be split into smaller files — a
 * second module would need the import the splice rule forbids,
 * which is why `many small files` has no expression here.
 * `tests/build/lib-splice.test.ts` registers it and reads what a
 * real build made of it.
 */

// ---------------------------------------------------------------------------
// The bound
// ---------------------------------------------------------------------------

/**
 * The longest an accepted name may be, measured on the trimmed
 * value in code units.
 *
 * Real entity names are short. A value past this is an extraction
 * that has turned into a payload, whatever it happens to hold, and
 * it is the backstop behind the denylist for a payload carrying no
 * shape the denylist names.
 *
 * Exported so a caller can say what the cap is without repeating
 * the number. It is not a parameter — see the header for why the
 * bound is not something a call site can widen.
 */
export const MAX_ENTITY_NAME_LENGTH = 80;

/**
 * Everything an accepted name may be made of.
 *
 * Letters and digits in any script, plus the punctuation that
 * turns up in real legal entity names: space, period, comma,
 * ampersand, apostrophe, parentheses and hyphen. Everything else
 * is out, including every character a path, a query string or a
 * fragment is built from.
 *
 * Script-wide rather than ASCII on purpose. A gate that refused
 * non-ASCII letters would reject a great many real names as
 * "suspicious" while stopping nothing, since none of the shapes
 * this file is about is spelt with a letter.
 *
 * Module-private, like the denylist: an exported `RegExp` is a
 * bound a caller can rewrite in place.
 */
const ENTITY_NAME_ALLOWED = /^[\p{L}\p{N} .,&'()-]+$/u;

/**
 * The shapes that could redirect a request or break out of a
 * prompt line.
 *
 * A scheme separator, an address separator, the two line
 * terminators, a backtick, the two brace and two bracket
 * delimiters, and the two angle brackets. Each is also outside
 * {@link ENTITY_NAME_ALLOWED}, so nothing here is the only thing
 * refusing it; they are named separately so a rejection reports
 * WHY, and so the intent of the rule survives a later widening of
 * the allowlist.
 *
 * Tested against the RAW value, before anything is trimmed or
 * collapsed. See the header — that ordering is the whole reason
 * this pattern is separate from the allowlist.
 */
const ENTITY_NAME_FORBIDDEN = /:\/\/|[@\r\n`{}[\]<>]/;

/**
 * A run of whitespace, as the normalization collapses it.
 *
 * The class is JavaScript's own, which is wider than the space
 * and the tab: it matches a no-break space, the line and
 * paragraph separators and a byte-order mark, and it does NOT
 * match a zero-width space. That split is why a name carrying one
 * of the first group survives and a name carrying a zero-width
 * space does not. See the header.
 */
const ENTITY_NAME_WHITESPACE_RUN = /\s+/g;

/**
 * What a model answers instead of a name when the document named
 * nothing.
 *
 * The default roster, and the one part of this gate a caller can
 * replace — see the header for why this is the piece that takes an
 * argument and the bound is not. Every entry is lowercase because
 * the comparison is, though a roster supplied by a caller is
 * lowercased before it is compared, so an entry written any other
 * way still works.
 *
 * Refusing one of these is not a safety refusal. It costs nothing
 * to research a placeholder except the request, which is the whole
 * reason the check is here and the reason turning it off by
 * passing an empty roster is a legitimate thing for a caller to
 * do.
 */
export const ENTITY_NON_ANSWERS: readonly string[] = [
  'unknown',
  'n/a',
  'none',
  'confidential',
  'stealth',
];

// ---------------------------------------------------------------------------
// What a caller reads back
// ---------------------------------------------------------------------------

/**
 * Every reason this gate refuses a value.
 *
 * Stable tokens rather than sentences, because they are written
 * into audit lines and counted: a reason whose spelling moves
 * breaks every reader that has already stored one.
 *
 * `empty` — nothing to validate: not a string at all, or nothing
 * but whitespace.
 *
 * `too_long` — past {@link MAX_ENTITY_NAME_LENGTH}.
 *
 * `forbidden_syntax` — carries one of the request shapes. The only
 * reason that is about capability rather than plausibility.
 *
 * `non_answer` — the whole value is one of the roster words.
 *
 * `invalid_character` — holds something outside the allowlist.
 */
export const ENTITY_NAME_REJECTIONS = [
  'empty',
  'too_long',
  'forbidden_syntax',
  'non_answer',
  'invalid_character',
] as const;

/** One member of {@link ENTITY_NAME_REJECTIONS}. */
export type EntityNameRejection = (typeof ENTITY_NAME_REJECTIONS)[number];

/** A name that passed every check, normalized and ready to use. */
export interface EntityNameAccepted {
  /** Always `true`, which is what a caller narrows on. */
  readonly ok: true;

  /**
   * The name, trimmed and with every whitespace run collapsed to
   * one space.
   *
   * Not the value that arrived: the normalization is part of what
   * was validated, so this is the string a caller must use rather
   * than its own copy of the input.
   */
  readonly name: string;
}

/**
 * A value the gate refused, and which check refused it.
 *
 * Carries NO name key, which is the original's shape and worth
 * keeping: a caller that forgot to narrow on `ok` reads
 * `undefined` rather than the unvalidated text it was about to
 * interpolate.
 */
export interface EntityNameRejected {
  /** Always `false`, which is what a caller narrows on. */
  readonly ok: false;

  /** Which check refused it. See {@link ENTITY_NAME_REJECTIONS}. */
  readonly reason: EntityNameRejection;
}

/** What {@link validateEntityName} answers. */
export type EntityNameResult = EntityNameAccepted | EntityNameRejected;

// ---------------------------------------------------------------------------
// The gate
// ---------------------------------------------------------------------------

/**
 * A refusal carrying its reason and nothing else.
 *
 * @param reason - Which check refused.
 * @returns The refusal, with no name key on it.
 */
function reject(reason: EntityNameRejection): EntityNameRejected {
  return { ok: false, reason };
}

/**
 * Whether a normalized name is the whole of one roster word.
 *
 * Compared whole and lowercased, so a name that merely contains a
 * roster word is not one — see the header.
 *
 * The roster is the CALLER's, not the document's, so it is read as
 * the strings its type says it is. The one untrusted input here is
 * the value being validated.
 *
 * @param name - The normalized name.
 * @param roster - The non-answers to compare it against.
 * @returns Whether the name is one of them.
 */
function isNonAnswer(name: string, roster: readonly string[]): boolean {
  const lowered = name.toLowerCase();

  return roster.some((entry) => entry.toLowerCase() === lowered);
}

/**
 * Decide whether an extracted name may be handed to a step with
 * tools bound.
 *
 * The four checks in the order the header fixes, answering on the
 * first that refuses. What comes back on acceptance is the
 * NORMALIZED name — trimmed, with whitespace runs collapsed — and
 * that is the string a caller must use, because it is the string
 * the allowlist was tested against.
 *
 * Never throws, for the reason the header gives: a rejection is an
 * outcome the pipeline is built to carry, and a raise here would
 * be a denial of service anybody who can place a document could
 * reach.
 *
 * Takes `unknown` on purpose. The spliced copy runs in a Code node
 * where nothing was ever type-checked, so this is all that stands
 * between a node handing this an object and an object reaching a
 * prompt.
 *
 * @param raw - Whatever the extraction produced, including
 *   nothing.
 * @param nonAnswers - The words this domain's extractor uses when
 *   it found no name. Defaults to {@link ENTITY_NON_ANSWERS}; an
 *   empty roster turns that check off.
 * @returns The normalized name, or the reason it was refused.
 */
export function validateEntityName(
  raw: unknown,
  nonAnswers: readonly string[] = ENTITY_NON_ANSWERS,
): EntityNameResult {
  if (typeof raw !== 'string') {
    return reject('empty');
  }

  // Before any whitespace normalization: collapsing first would
  // fold a value carrying a line break into one plausible line and
  // let the smuggled second line through. See the header.
  if (ENTITY_NAME_FORBIDDEN.test(raw)) {
    return reject('forbidden_syntax');
  }

  const trimmed = raw.trim();

  if (trimmed === '') {
    return reject('empty');
  }

  if (trimmed.length > MAX_ENTITY_NAME_LENGTH) {
    return reject('too_long');
  }

  const name = trimmed.replace(ENTITY_NAME_WHITESPACE_RUN, ' ');

  if (isNonAnswer(name, nonAnswers)) {
    return reject('non_answer');
  }

  if (!ENTITY_NAME_ALLOWED.test(name)) {
    return reject('invalid_character');
  }

  return { ok: true, name };
}
