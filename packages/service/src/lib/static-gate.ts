/**
 * @packageDocumentation
 * static-gate — deciding what is worth looking at, for free.
 *
 * Every document a pipeline ingests could be handed to a model.
 * Doing that unconditionally is not a policy, it is the absence of
 * one, and it is what an unbounded bill looks like from the inside.
 * This module is the free decision that runs first: sum the weight
 * of every term PRESENT in a document's chunk — once per term,
 * however often it occurs — and compare the total to the operator's
 * threshold. At or above it the document is worth attention. Below
 * it the document is ignored AND its score is recorded, which is
 * the only thing that makes the threshold tunable against real
 * numbers instead of taste.
 *
 * ## Three properties, each with a case
 *
 * IT FAILS CLOSED. No terms, no chunk, an unreadable document, a
 * pattern that will not compile — none of them can produce a
 * decision to spend. The worst case is a document parked for a
 * human.
 *
 * IT SCORES THE CHUNK. Never a body. The caller passes what
 * `src/lib/chunk.ts` built, and there is no fallback — the same
 * bounded-chunk contract every other consumer here is held to.
 *
 * NEGATIVES ALWAYS SUBTRACT. A term's direction is its polarity and
 * nothing else: the magnitude is taken as an absolute value, so a
 * row whose weight was written negative counts exactly as its
 * positive would and no sign convention can invert the gate. That
 * is the same statement the `terms.weight` column makes about
 * itself, enforced here rather than assumed.
 *
 * ## What this port takes as input, and why
 *
 * THE TERM SET IS AN ARGUMENT, and it arrives in the shape a
 * `terms` row has: {@link GateTerm} is a pattern, a weight and a
 * polarity. The original read a parsed lexicon file with two lists
 * inside it — a positive list of literal terms and a negative list
 * of phrase regexes — which was one deployment's vocabulary
 * compiled into the matcher. Here the vocabulary is rows in a
 * table a domain owns, and a list is a query over them.
 *
 * Five consequences follow, and each is somewhere this file differs
 * from a plain transcription.
 *
 * The LITERAL/REGEX split rides on polarity. A positive term is
 * escaped before it is compiled, so an operator can write a pattern
 * full of punctuation without taking the scanner down; a negative
 * one is compiled as written, because a negative is normally a
 * phrase with alternatives in it. That was carried by which list an
 * entry sat in and is carried by {@link GateTerm.polarity} now.
 *
 * The THIRD POLARITY. `terms.polarity` admits `ignore` beside the
 * two the original had, and a term carrying it is skipped in
 * silence: it is a row that deliberately counts for nothing, which
 * is a statement rather than a fault. A polarity outside the three
 * IS a fault, and is reported the way an uncompilable pattern is.
 *
 * The THRESHOLD moved. It was a member of the lexicon file beside
 * the two lists; a list of rows has nowhere to keep it, so it is
 * {@link GateOptions.threshold} and defaults to
 * {@link DEFAULT_THRESHOLD} exactly as it did.
 *
 * The HIT KEYS follow the input. A hit names the `pattern` that
 * matched and the `polarity` it carried, where the original said
 * `term` and `kind` — one vocabulary in the file rather than two.
 *
 * The TWO PASSES are kept, and this is the one place where keeping
 * something costs more than dropping it would. The terms arrive as
 * one list and could be walked once, in row order. They are walked
 * twice instead, positives and then negatives, because hit order is
 * observable: {@link explainGate} quotes the first
 * {@link MAX_REASON_HITS} hits and counts the rest, so a single
 * pass would reorder every explanation the gate has ever written.
 *
 * ## The other divergence: the language detector is injected
 *
 * A document the term set CANNOT READ must not be scored zero and
 * dropped. A document in a language the terms are not written in
 * scores 0 against them and is ignored with a confident measured
 * zero — a number for text nobody looked at, which is the same lie
 * the no-chunk branch already refuses to tell. Same treatment:
 * {@link applyStaticGate} leaves the score NULL and parks the
 * document.
 *
 * The original reached for a sibling language library through a
 * guarded `require`, with a bare global as a second fallback for
 * the spliced context. Both are gone. A detector arrives as
 * {@link GateOptions.detectLanguage}, an ordinary optional
 * parameter, which is spliceable by construction rather than by
 * accident and which a caller can substitute in a test without a
 * module registry. No detector means no language opinion, which is
 * exactly what the guarded require degraded to when the sibling was
 * absent.
 *
 * COVERAGE is stated rather than derived, for the same reason the
 * term set is. The original asked whether any list entry was tagged
 * with the detected language, and treated one language as covered
 * by default because its own lists were written in it. A `terms`
 * row has no language column and this file has no default language
 * to name, so the caller passes {@link GateOptions.languages} — the
 * tags its term set covers — and {@link coversLanguage} answers
 * against that. Self-clearing the same way: the day a domain adds
 * terms in a language, its list gains that tag and the gate scores
 * normally again.
 *
 * ## What is kept
 *
 * The anchored compile with its two lookarounds, the escape, the
 * weight and list coercions, the scoring pass with its hit and
 * warning records, the threshold default, the explanation with its
 * hit ceiling and its unusable-entry tail, and the gate's three
 * outcomes.
 *
 * A parity suite is what says so rather than this paragraph, and it
 * is `tests/parity/static-gate.parity.test.ts`. Its leg is the
 * KERNEL, and the kernel is bounded by the ORIGINAL's export
 * surface rather than by this file's. The original exported four
 * things and three of them have a counterpart an input can drive
 * on both sides — the scoring pass, the explanation and the
 * threshold default — so those are compared directly, and the
 * escape, the compile and the two coercions are inside the leg
 * COMPOSITIONALLY, an input reaching one comparing it. What that cannot see is a pair of errors
 * cancelling between two of them, which is why
 * `tests/lib/static-gate.test.ts` drives each on its own as well.
 * Read the two files together; neither is the whole reading.
 *
 * {@link applyStaticGate} sits outside the leg by construction. It
 * reads a term set the original has no parameter for and a language
 * roster it has no concept of, so no one input could drive both
 * sides. Characterization cases are what cover it.
 *
 * ## What is dropped
 *
 * The lexicon, entirely: no term, no phrase, no language tag and no
 * subject matter of any kind appears in this file, and a search of
 * it says nothing about what any domain is looking for. The guarded
 * CommonJS export block at the foot of the original becomes
 * declaration exports, which is what the splice strips and what a
 * Code node can run, and `var` becomes `const`; neither moves an
 * answer. The reason sentences naming one deployment's sender
 * taxonomy are re-authored to say only what is true of any
 * document.
 *
 * The record copy is the last one, and it is a repair rather than a
 * rename. The original copied a row with a guarded `for...in` and
 * an assignment per key; this one spreads. For every ordinary
 * record those are the same set of keys. They differ for a record
 * carrying an own `__proto__` key, where the assignment reaches the
 * setter on `Object.prototype` — replacing the copy's prototype, or
 * doing nothing at all — and the spread defines a real own key. The
 * gated half of this port preserves such readings; this half has no
 * gate to preserve them against, and a record arriving from storage
 * is exactly where the key comes from.
 *
 * ## What is preserved deliberately
 *
 * Six readings that look like faults until the argument is read.
 * Each has a case of its own in `tests/lib/static-gate.test.ts`.
 *
 * {@link DEFAULT_THRESHOLD} is never 0. A zero threshold passes
 * every document, which is the unbounded shape this module exists
 * to replace, so an absent or unusable threshold falls back to a
 * number that refuses something.
 *
 * A zero-weight negative term records `-0` as its hit weight, since
 * the record is built by negating the magnitude. It survives a
 * strict comparison and not a JSON round trip, which is why it is
 * pinned rather than tidied.
 *
 * {@link explainGate} quotes the OPERATOR's patterns and the
 * arithmetic, never the document. The explanation is stored for
 * every row, and text from a document would make that column a
 * place untrusted content lands unsanitized.
 *
 * A document that PASSES goes to review rather than to a model.
 * What a passing document is worth spending on is the decision of
 * the phase that wires this gate into a workflow; dropping it in
 * the meantime would lose exactly what the gate exists to find.
 *
 * {@link explainGate} is defensive about the RESULT and not about
 * the entries inside its hit list, so an entry with no members at
 * all raises where an entry that is a number reads as a hit with
 * no pattern and no weight. Neither is reachable from a list
 * {@link scoreText} built, and the asymmetry is inside the parity
 * leg — repairing it would be a divergence in the one function
 * the leg compares directly. See {@link memberOf}.
 *
 * A positive term cannot produce the refusal its own warning
 * sentence describes, because the escape runs before the compile
 * and no escaped term has been found that will not compile. The
 * sentence survives because the compile is exported and a caller
 * composing it can hand it anything.
 *
 * ## Null and zero
 *
 * The gate writes a NULL score for a document it could not read —
 * no chunk, or a chunk in a language the term set does not cover —
 * and a number for every document it scored, including 0. That is
 * the whole distinction: 0 is a measurement, null is the absence of
 * one, and a scoring layer that renormalizes across documents needs
 * to tell them apart. Nothing here reports a score it did not take.
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
// Bounds and vocabularies
// ---------------------------------------------------------------------------

/**
 * The threshold used when the caller states no usable one.
 *
 * Never 0, and the reason is in the header: a zero threshold passes
 * every document, which is not a gate. A default that refuses
 * something is the honest stand-in for an operator who has not
 * tuned one yet.
 */
export const DEFAULT_THRESHOLD = 5;

/**
 * How many hits an explanation quotes before it counts the rest.
 *
 * The explanation goes in a column read at a glance. Past a handful
 * of terms it stops being a sentence and starts being the term set
 * printed back, so the tail becomes a count.
 */
export const MAX_REASON_HITS = 6;

/**
 * Which way a term moves a score.
 *
 * The same three values as the `terms.polarity` column, written out
 * again here rather than imported from the schema module. The
 * splice rule is what forces the second declaration: a library that
 * imports anything cannot be inlined into a Code node, so the set a
 * matcher programs against and the set the column stores can only
 * be one declaration in a package that never splices. Holding the
 * two set-equal is the suite's job.
 */
export const GATE_POLARITIES = ['positive', 'negative', 'ignore'] as const;

/** One member of {@link GATE_POLARITIES}. */
export type GatePolarity = (typeof GATE_POLARITIES)[number];

/**
 * The value a record's decision field carries when it is waiting to
 * be gated.
 *
 * {@link applyStaticGate} acts on exactly this and returns anything
 * else untouched, which is what lets the same call run over a mixed
 * batch: a record another step already decided is not re-decided
 * here, whatever it says.
 */
export const GATE_DECISION_PENDING = 'needs_gate';

/**
 * The decision that parks a record for a human.
 *
 * Two different roads end here — a document the gate could not read
 * and a document that scored at or above the threshold — and the
 * reason is what separates them. That is deliberate: both are
 * things a person should look at, and a caller draining the queue
 * does not need two names for it.
 */
export const GATE_DECISION_REVIEW = 'manual_review';

/** The decision that drops a record, with its score recorded. */
export const GATE_DECISION_IGNORE = 'ignore';

/**
 * What {@link scoreText} concluded, before the gate maps it onto a
 * decision.
 *
 * Two words rather than the decision vocabulary above, because the
 * scoring pass answers a question about the score and the gate
 * answers a question about the record. What a passing score is
 * worth doing is the caller's, and today it is review.
 */
export type ScoreDecision = 'parse' | 'ignore';

// ---------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------

/**
 * Every character that means something to a regular expression.
 *
 * What separates a literal term from a phrase pattern: a positive
 * term goes through {@link escapeGateTerm} before it is compiled,
 * so punctuation in it is punctuation rather than syntax.
 */
const REGEX_METACHARACTERS = /[.*+?^${}()|[\]\\]/g;

/**
 * What must NOT precede a match, as a lookbehind.
 *
 * The whole safety property of this module, with the lookahead
 * below: a term is written bare by an operator and is never
 * trusted bare. Without them a short pattern fires inside longer
 * and unrelated words — a false positive that is invisible in a
 * score and obvious only in the document it came from.
 */
const NOT_PRECEDED_BY_WORD = '(?<![a-z0-9])';

/** What must not follow a match, as a lookahead. */
const NOT_FOLLOWED_BY_WORD = '(?![a-z0-9])';

// ---------------------------------------------------------------------------
// What a caller declares, and what comes back
// ---------------------------------------------------------------------------

/**
 * One term the gate matches on, as a `terms` row states it.
 *
 * The three columns that decide a match, and nothing else: no id,
 * no category and no notes, because the matcher reads none of them.
 * A caller selecting a domain's terms projects onto this shape.
 */
export interface GateTerm {
  /**
   * What to look for.
   *
   * Read as a LITERAL under `positive` polarity and as a regular
   * expression under `negative` — see the header for why the split
   * rides on polarity. Either way it is matched anchored, never
   * bare.
   */
  readonly pattern: string;

  /**
   * How much a match is worth, as a magnitude.
   *
   * The sign is not consulted: {@link termWeight} reads the number
   * and the scoring pass takes its absolute value, so a row written
   * negative counts as its positive would.
   */
  readonly weight: number;

  /** Which way a match moves the score. */
  readonly polarity: GatePolarity;
}

/**
 * What the caller states beside the term set.
 *
 * Every member is optional and every one has a defined absence.
 * That is what makes the two-argument call — a text and a term set
 * — the whole of what the gate needs, with the rest supplied only
 * by a deployment that has something to say.
 */
export interface GateOptions {
  /**
   * The score at or above which a document is worth attention.
   *
   * Anything that is not a finite number falls back to
   * {@link DEFAULT_THRESHOLD}, including a threshold that arrived
   * as a string from a configuration file.
   */
  readonly threshold?: number;

  /**
   * The language tags the term set covers.
   *
   * Read only when a detector answered, and only by
   * {@link applyStaticGate}. An empty or absent roster means a
   * detected language is covered by nothing, which parks every
   * document a detector could read — so a deployment that supplies
   * a detector supplies this too.
   */
  readonly languages?: readonly string[];

  /**
   * How to tell what language a chunk is in, if anything can.
   *
   * Absent means no language opinion, which is the pre-detector
   * behaviour: every document is scored against the term set as it
   * stands. See {@link detectGateLanguage} for what an answer has
   * to look like to count as one.
   */
  readonly detectLanguage?: (text: string) => unknown;
}

/**
 * The part of a built chunk this module reads.
 *
 * Declared here rather than imported from `src/lib/chunk.ts` for
 * the reason the header gives: a spliced library imports nothing.
 * A real `ChunkResult` satisfies it structurally, and so does the
 * plain object a Code node hands across a workflow connection.
 */
export interface GateChunk {
  /** Whether the reduction produced something worth reading. */
  readonly usable?: boolean;

  /** The prepared text, which is the only thing scored. */
  readonly chunk?: string;

  /** Why it is not usable, when it is not. */
  readonly reason?: string;
}

/** One term that was present in the text, and what it was worth. */
export interface GateHit {
  /** The pattern as the operator wrote it. */
  readonly pattern: string;

  /**
   * What it contributed, SIGNED.
   *
   * Positive for a term that raised the score and negative for one
   * that lowered it, which is what lets an explanation be assembled
   * without consulting the polarity beside it.
   */
  readonly weight: number;

  /** Which of the two scoring polarities it carried. */
  readonly polarity: 'positive' | 'negative';
}

/** What the scoring pass measured, and what it concluded. */
export interface GateScore {
  /** The sum, which is a measurement and never null. */
  readonly score: number;

  /** What it was compared against, after the default. */
  readonly threshold: number;

  /** Every term present, positives first. */
  readonly hits: readonly GateHit[];

  /** Whether the score reached the threshold. */
  readonly decision: ScoreDecision;

  /** Every list entry that could not be used, in order. */
  readonly warnings: readonly string[];
}

// ---------------------------------------------------------------------------
// Refusals
// ---------------------------------------------------------------------------

/**
 * Every sentence a warning is assembled from.
 *
 * Collected here rather than written at the call sites so the three
 * faults a term set can carry are auditable in one place — and so
 * the two that the original also reports are comparable against it
 * without reading three loops.
 *
 * Not exported. The suite declares the roster itself and holds it
 * against what the cases produce, which fails naming a sentence
 * nothing reaches; a suite reading them off this object would agree
 * with any edit to them.
 */
const GATE_WARNINGS = {
  /** A literal term that would not compile even after escaping. */
  positive: 'positive term did not compile: ',

  /** An operator's phrase pattern that is not a valid expression. */
  negative: 'negative pattern did not compile: ',

  /** A polarity outside the three the column admits. */
  polarity: 'term carries an unusable polarity: ',
} as const;

/**
 * Every sentence a gate reason is assembled from.
 *
 * Re-authored rather than carried: the original's named the sender
 * taxonomy of one deployment, which said why a message had reached
 * the gate at all. Here a record reaches the gate because its
 * decision field said so, and the reason has only to say what the
 * gate could not do.
 */
const GATE_REASONS = {
  /** No chunk at all, or one the reduction refused. */
  noChunk: 'no chunk to gate',

  /** Stands in when the refused chunk carried no reason of its own. */
  noChunkFallback: 'no chunk was built',

  /** Opens the sentence naming a language the term set cannot read. */
  unreadablePrefix: 'chunk detected as ',

  /** Closes it. ASCII dashes: this source carries no other kind. */
  unreadableSuffix: ', which the term set does not cover -- not scorable',
} as const;

// ---------------------------------------------------------------------------
// Reading a value
// ---------------------------------------------------------------------------

/**
 * Whatever a caller had, as text.
 *
 * Absence becomes the empty string and everything else is
 * converted, which is the original's reading and the reason nothing
 * below has to guard its own argument.
 *
 * The conversion raises for exactly one kind of value: an object
 * whose own conversion throws. A symbol is not one of them, which
 * reads as though it should be — `String()` called as a function
 * special-cases a symbol and answers its description, where a
 * template or a concatenation refuses it.
 *
 * @param value - Anything at all.
 * @returns Its text, or the empty string for absence.
 */
function asText(value: unknown): string {
  return value === null || value === undefined
    ? ''
    : String(value);
}

/**
 * Whether a value can be read by key at all.
 *
 * A list is excluded: indexing one by a field name answers nothing,
 * and a roster passed where a term belonged should read as no term
 * rather than as an empty one.
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
 * A list, or an empty one.
 *
 * The gate is handed a term set from a query and a hit list from a
 * value that may have crossed a workflow connection as JSON. Either
 * can arrive as something that is not a list, and every reader
 * below wants a list to walk rather than a guard of its own.
 *
 * @param value - Anything at all.
 * @returns The value when it is an array, otherwise an empty one.
 */
export function asList(value: unknown): readonly unknown[] {
  return Array.isArray(value)
    ? (value as readonly unknown[])
    : [];
}

/**
 * How much an entry's match is worth, as a finite number.
 *
 * Two coercions, in the original's order. A number is taken as it
 * is; anything else is read as text and parsed, so a weight that
 * arrived as `'3'` from a configuration file counts as 3 and one
 * that arrived as prose counts as nothing. A value that is not
 * finite either way becomes 0 — a term that contributes nothing
 * rather than a score that becomes unreadable.
 *
 * The SIGN survives here and is taken away by the scoring pass,
 * which is where the direction is decided. Read on its own this
 * answers what the row says; read through the gate it answers a
 * magnitude.
 *
 * @param entry - A term row, or anything at all.
 * @returns Its weight, or 0.
 */
export function termWeight(entry: unknown): number {
  const raw = isRecord(entry)
    ? entry['weight']
    : undefined;
  const parsed = typeof raw === 'number'
    ? raw
    : Number.parseFloat(asText(raw));

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

// ---------------------------------------------------------------------------
// Compiling a pattern
// ---------------------------------------------------------------------------

/**
 * A literal term, safe to compile.
 *
 * Every regular-expression metacharacter is escaped, so a term full
 * of punctuation is matched as the punctuation it is. This is what
 * lets an operator write a positive term without knowing that the
 * matcher is a regular expression at all.
 *
 * @param term - The term as it was written.
 * @returns The same text with its metacharacters escaped.
 */
export function escapeGateTerm(term: unknown): string {
  return asText(term).replace(REGEX_METACHARACTERS, '\\$&');
}

/**
 * A pattern, anchored, or nothing.
 *
 * The two lookarounds are the anchoring, and they are applied to
 * every pattern whichever polarity it came from — a literal term
 * and a phrase pattern have the same word-boundary problem. Case
 * is not significant, which is the original's reading and the one
 * an operator writing a list expects.
 *
 * Returns `null` rather than raising, because a term set arrives
 * from an operator and an entry that will not compile is a bad row
 * rather than a bad program. The caller reports it and goes on: a
 * matcher that quietly stops matching is the failure this whole
 * layer exists to avoid.
 *
 * @param pattern - The expression source, already escaped when the
 *   entry was a literal.
 * @returns The compiled expression, or `null` when it will not
 *   compile.
 */
export function compileGatePattern(pattern: unknown): RegExp | null {
  try {
    return new RegExp(
      `${NOT_PRECEDED_BY_WORD}(?:${asText(pattern)})${NOT_FOLLOWED_BY_WORD}`,
      'i',
    );
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Language
// ---------------------------------------------------------------------------

/**
 * What language a chunk is in, as far as anything here can tell.
 *
 * The detector is whatever the caller supplied, and this is the
 * whole of what it has to satisfy: it takes text and answers
 * something carrying a `lang` member. A detector that raises, that
 * answers a value with no such member, or that answers a member
 * which is not a non-empty string, has said NOTHING — which is the
 * absent-detector reading, and is deliberately not the same as
 * reporting an unreadable document. A broken detector would
 * otherwise park every document rather than the ones a term set
 * cannot read, and the gate would stop gating.
 *
 * @param text - The chunk to identify.
 * @param detect - The caller's detector, if it supplied one.
 * @returns The language tag, or `null` for no opinion.
 */
export function detectGateLanguage(
  text: unknown,
  detect?: unknown,
): string | null {
  if (typeof detect !== 'function') {
    return null;
  }

  const answer = readDetector(detect as (value: string) => unknown, text);
  const lang = isRecord(answer)
    ? answer['lang']
    : undefined;

  return typeof lang === 'string' && lang !== ''
    ? lang
    : null;
}

/**
 * One detector call, whatever it does.
 *
 * Separate from the reading above so the `try` wraps the call and
 * nothing else. A detector is foreign code and the only thing this
 * module promises about it is that its failure cannot become the
 * gate's.
 *
 * @param detect - The caller's detector.
 * @param text - What to identify.
 * @returns Whatever it answered, or `undefined` when it raised.
 */
function readDetector(
  detect: (value: string) => unknown,
  text: unknown,
): unknown {
  try {
    return detect(asText(text));
  } catch {
    return undefined;
  }
}

/**
 * Whether the term set can read a document in this language.
 *
 * No detected language means no reason to doubt the term set, so
 * the answer is yes — that is what makes a deployment with no
 * detector behave exactly as it did before there was one.
 *
 * With a language in hand the answer is membership, and nothing
 * else. There is no default language here: which languages a term
 * set covers is a fact about that term set, and a file that named
 * one would be naming a deployment's.
 *
 * @param languages - The tags the term set covers.
 * @param lang - What the detector said, or `null`.
 * @returns Whether scoring the document would mean anything.
 */
export function coversLanguage(languages: unknown, lang: unknown): boolean {
  if (typeof lang !== 'string' || lang === '') {
    return true;
  }

  return asList(languages).some((entry) => asText(entry) === lang);
}

// ---------------------------------------------------------------------------
// The scoring pass
// ---------------------------------------------------------------------------

/** One term set entry, classified once, before either pass. */
interface ClassifiedTerm {
  /** The pattern source, non-empty. */
  readonly pattern: string;

  /** Which scoring pass will read it. */
  readonly polarity: 'positive' | 'negative';

  /** The entry itself, which is where the weight is read from. */
  readonly entry: unknown;
}

/**
 * The threshold the caller stated, or the default.
 *
 * @param options - Whatever the caller passed.
 * @returns A finite threshold.
 */
function readThreshold(options: GateOptions): number {
  const stated = options.threshold;

  return typeof stated === 'number' && Number.isFinite(stated)
    ? stated
    : DEFAULT_THRESHOLD;
}

/**
 * Sum every term present in a text, and say what that means.
 *
 * A term counts ONCE however often it occurs. That is the whole
 * arithmetic, and it is why a document repeating one word cannot
 * out-score a document that says several different things.
 *
 * The list is walked three times and the reason is in the header:
 * a classification pass, which is where an unusable row is
 * reported, and then one scoring pass per polarity so that hit
 * order does not depend on the order the rows arrived in.
 *
 * The TEXT can never make it raise: anything that is not a string
 * scores as the empty text, which is the original's reading and
 * the reason a chunk arriving across a workflow connection cannot
 * take the pass down. A TERM can, and exactly one value in one
 * does — a pattern whose own text conversion throws. That is the
 * single fault the pass reports by raising rather than by
 * warning, because there is no sentence to put the pattern in.
 * Everything else a term set can carry is a warning and the pass
 * goes on.
 *
 * @param text - The prepared chunk. Anything that is not a string
 *   scores as the empty text, which is the original's reading.
 * @param terms - The domain's term set.
 * @param options - The threshold, if the caller states one.
 * @returns The score, what it was compared against, every hit and
 *   every unusable entry.
 */
export function scoreText(
  text: unknown,
  terms: readonly GateTerm[],
  options: GateOptions = {},
): GateScore {
  const subject = typeof text === 'string'
    ? text
    : '';
  const threshold = readThreshold(options);
  const warnings: string[] = [];
  const classified = classifyTerms(terms, warnings);
  const hits: GateHit[] = [];
  let score = 0;

  for (const term of classified) {
    if (term.polarity !== 'positive') {
      continue;
    }

    const compiled = compileGatePattern(escapeGateTerm(term.pattern));

    if (compiled === null) {
      warnings.push(GATE_WARNINGS.positive + term.pattern);
      continue;
    }

    if (!compiled.test(subject)) {
      continue;
    }

    const weight = Math.abs(termWeight(term.entry));

    score += weight;
    hits.push({ pattern: term.pattern, weight, polarity: 'positive' });
  }

  for (const term of classified) {
    if (term.polarity !== 'negative') {
      continue;
    }

    const compiled = compileGatePattern(term.pattern);

    if (compiled === null) {
      warnings.push(GATE_WARNINGS.negative + term.pattern);
      continue;
    }

    if (!compiled.test(subject)) {
      continue;
    }

    const weight = Math.abs(termWeight(term.entry));

    score -= weight;
    hits.push({
      pattern: term.pattern,
      weight: -weight,
      polarity: 'negative',
    });
  }

  return {
    score,
    threshold,
    hits,
    decision: score >= threshold
      ? 'parse'
      : 'ignore',
    warnings,
  };
}

/**
 * Every entry that will be scored, and a warning for every entry
 * that cannot be.
 *
 * Three readings, and only one of them is loud. An entry that is
 * not a record, or whose pattern is empty, is skipped in silence:
 * there is nothing to report about a row that says nothing, and
 * that is the original's reading of an empty term. An entry
 * carrying `ignore` is also silent, and for a stronger reason — it
 * is a row saying deliberately that it counts for nothing, which is
 * a statement rather than a fault. A polarity outside the three IS
 * a fault, and is the one thing here the original has no
 * counterpart for, because it had no polarity column to get wrong.
 *
 * @param terms - The term set, as the caller passed it.
 * @param warnings - Collected in place, in row order.
 * @returns Every scorable entry, in the order it arrived.
 */
function classifyTerms(
  terms: unknown,
  warnings: string[],
): readonly ClassifiedTerm[] {
  const classified: ClassifiedTerm[] = [];

  for (const entry of asList(terms)) {
    const pattern = isRecord(entry)
      ? asText(entry['pattern'])
      : '';

    if (pattern === '') {
      continue;
    }

    const polarity = isRecord(entry)
      ? entry['polarity']
      : undefined;

    if (polarity === 'positive' || polarity === 'negative') {
      classified.push({ pattern, polarity, entry });
      continue;
    }

    if (polarity !== 'ignore') {
      warnings.push(GATE_WARNINGS.polarity + asText(polarity));
    }
  }

  return classified;
}

// ---------------------------------------------------------------------------
// The explanation
// ---------------------------------------------------------------------------

/**
 * A one-line account of a decision, for storage beside it.
 *
 * It quotes the operator's own patterns and the arithmetic and
 * NEVER the document. This string is written for every record the
 * gate touches, so text from a document would make its column a
 * place untrusted content lands unsanitized — and a column read at
 * a glance is exactly where that is least likely to be noticed.
 *
 * Defensive about its argument on purpose. A result may have
 * crossed a workflow connection as JSON and come back with
 * anything at all in it, and an explanation that raised would lose
 * the decision it was describing.
 *
 * @param result - A {@link GateScore}, or whatever arrived in place
 *   of one.
 * @returns The account, always a string.
 */
export function explainGate(result: unknown): string {
  const record = isRecord(result)
    ? result
    : {};
  const hits = asList(record['hits']);
  const parts: string[] = [];

  for (const hit of hits.slice(0, MAX_REASON_HITS)) {
    // The weight is read BEFORE the pattern, which matters for
    // exactly one input: an entry with no members at all raises,
    // and which member it was reached for is in the sentence.
    const raw = memberOf(hit, 'weight');
    const weight = typeof raw === 'number'
      ? raw
      : 0;
    const pattern = asText(memberOf(hit, 'pattern'));
    const sign = weight >= 0
      ? '+'
      : '';

    parts.push(`${pattern} ${sign}${weight}`);
  }

  if (hits.length > MAX_REASON_HITS) {
    parts.push(`+${hits.length - MAX_REASON_HITS} more`);
  }

  const detail = parts.length > 0
    ? ` (${parts.join(', ')})`
    : ' (no terms matched)';

  return 'static gate: score '
    + `${asText(record['score'])} vs threshold ${asText(record['threshold'])}`
    + detail
    + unusableTail(asList(record['warnings']).length);
}

/**
 * One member of a hit, read the way the original reads it.
 *
 * UNGUARDED, deliberately, and the asymmetry is the original's: the
 * explanation checks that the RESULT is a record and checks nothing
 * about the entries inside its hit list. A hit that is a number
 * reads as a hit with no pattern and no weight; a hit that is
 * `null` raises. Both are unreachable from a list
 * {@link scoreText} built, which is why the reading survives the
 * port rather than being tidied — repairing it would be a
 * divergence in the one function the parity leg compares directly.
 *
 * @param value - One entry of the hit list.
 * @param key - The member to read.
 * @returns Whatever is there, raising for an entry with no members
 *   at all.
 */
function memberOf(value: unknown, key: string): unknown {
  return (value as Record<string, unknown>)[key];
}

/**
 * The count of unusable entries, when there were any.
 *
 * Appended to every explanation rather than kept in a log, because
 * an operator reading why a document was ignored is the person who
 * can fix the row that did not compile — and the number is small
 * enough to sit at the end of a sentence.
 *
 * @param warned - How many entries could not be used.
 * @returns The bracketed tail, or the empty string.
 */
function unusableTail(warned: number): string {
  if (warned === 0) {
    return '';
  }

  const noun = warned === 1
    ? 'y'
    : 'ies';

  return ` [${warned} unusable list entr${noun}]`;
}

// ---------------------------------------------------------------------------
// The gate
// ---------------------------------------------------------------------------

/**
 * Decide one record, and answer a new one.
 *
 * The single definition every caller shares, so two ingest paths
 * can never gate the same document differently. A record whose
 * decision field is not {@link GATE_DECISION_PENDING} comes back
 * untouched — the same object, not a copy — which is what makes
 * this safe to run over a batch something else has already been
 * through.
 *
 * Three outcomes, and two of them leave the score NULL:
 *
 * No usable chunk. There is nothing to score, and a confident 0 for
 * a document nobody could read would be a lie that also drops it.
 * The record is parked, and the chunk's own reason is quoted so the
 * refusal is diagnosable from the row.
 *
 * A chunk in a language the term set does not cover. Scoring it
 * would produce a 0 that means "these terms are not in this
 * language" and reads as "this document is uninteresting". Parked
 * for the same reason, and self-clearing: the day the term set
 * covers that language, the gate scores normally again.
 *
 * A scored chunk. The score is recorded whichever way the decision
 * went, which is the only thing that makes the threshold tunable
 * against real numbers. A document at or above it is parked for
 * review rather than sent anywhere — see the header.
 *
 * The fields written are `gate_score`, `gate_decision` and
 * `gate_reason`. No column carries them yet; the phase that wires
 * this gate into a workflow decides where they land, and this is
 * the one place their names are written.
 *
 * @param record - The row to decide.
 * @param chunk - What `src/lib/chunk.ts` built from it.
 * @param terms - The domain's term set.
 * @param options - The threshold, the covered languages and the
 *   detector, each optional.
 * @returns A new record carrying the three gate fields, or the
 *   original when it was not waiting to be gated.
 */
export function applyStaticGate(
  record: unknown,
  chunk: GateChunk | null | undefined,
  terms: readonly GateTerm[],
  options: GateOptions = {},
): Record<string, unknown> {
  const row = isRecord(record)
    ? record
    : {};

  if (row['gate_decision'] !== GATE_DECISION_PENDING) {
    return row;
  }

  if (!chunk || !chunk.usable) {
    const stated = chunk
      ? asText(chunk.reason)
      : '';
    const why = stated === ''
      ? GATE_REASONS.noChunkFallback
      : stated;

    return {
      ...row,
      gate_score: null,
      gate_decision: GATE_DECISION_REVIEW,
      gate_reason: `${GATE_REASONS.noChunk} (${why})`,
    };
  }

  const detected = detectGateLanguage(chunk.chunk, options.detectLanguage);

  if (!coversLanguage(options.languages, detected)) {
    return {
      ...row,
      gate_score: null,
      gate_decision: GATE_DECISION_REVIEW,
      gate_reason: GATE_REASONS.unreadablePrefix
        + asText(detected)
        + GATE_REASONS.unreadableSuffix,
    };
  }

  const result = scoreText(asText(chunk.chunk), terms, options);

  return {
    ...row,
    gate_score: result.score,
    gate_decision: result.decision === 'parse'
      ? GATE_DECISION_REVIEW
      : GATE_DECISION_IGNORE,
    gate_reason: explainGate(result),
  };
}
