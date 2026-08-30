/**
 * @packageDocumentation
 * features — the deterministic feature vector: one document in, one
 * flat record of finite numbers out.
 *
 * No nesting, no strings, no nulls. A trainer reads the record as a
 * matrix row; an operator reads it as an account of what the
 * deterministic layer saw before any model was asked anything. It
 * computes nothing of its own beyond arithmetic over readings other
 * steps produced: the gate's score and its hits, a document's
 * prepared text, and whatever quantities and stated values the
 * pipeline filed beside them.
 *
 * ## The two properties this file exists for
 *
 * DETERMINISM. The same document and the same domain configuration
 * produce a byte-identical record, INCLUDING KEY ORDER. That is not
 * a serialization nicety. A column's position is part of what it
 * means — a one-hot at column 34 stands for whichever roster member
 * sits at index 34 — so a model trained where column 34 meant one
 * category and scored against a build where it means another is
 * wrong in a way nothing raises. The arithmetic succeeds over
 * numbers that no longer stand for the same things, which is the
 * same failure `documents.features` warns about in its own column
 * comment.
 *
 * Two things make the order a property of the CONTENT rather than
 * of the delivery. Every roster this module derives is sorted and
 * deduplicated here rather than taken in the order it arrived, so a
 * caller cannot move a column by reordering rows a query returned
 * in no particular order or keys a JSON object happened to hold.
 * And every column carries its group's prefix, because a bare
 * declared key can be integer-like and an integer-like own key is
 * enumerated FIRST whatever order it was written in — measured, a
 * record written `b`, `12`, `a` enumerates `12`, `b`, `a`. Under
 * bare keys a domain naming a quantity `12` would get a record
 * whose key order silently stopped being {@link featureKeys}'s.
 *
 * Both of those are about a COLUMN, and one thing a row order can
 * still move is a COUNT. A pattern filed under two categories
 * counts for the first category the term set names, so the same
 * rows arriving in another order move its hits between two columns
 * that both still exist — measured, and pinned by a case of its
 * own in `tests/lib/features.test.ts`. That is a taxonomy fault
 * this module reports by counting rather than by refusing, for the
 * reason {@link extractFeatures} gives, and it is invisible to the
 * key list and to a digest over it. It is one of the drifts the
 * term-set half of the version pin exists for.
 *
 * VERSIONING. {@link FEATURE_MECHANISM_VERSION} changes whenever
 * the MEANING of the vector changes, and it pins TWO inputs, not
 * one:
 *
 * - THE KEY LIST, which is this module's own layout: the groups
 *   below, their order, their prefixes and what each column counts.
 *   A column added, removed, renamed or redefined here moves every
 *   stored vector's meaning without moving a stored byte.
 *
 * - THE DOMAIN'S TERM SET, which is where most of these columns
 *   actually come from. The category columns are derived from the
 *   `terms` rows handed in, so adding a term under a new category
 *   inserts a column, and re-filing a term moves counts between two
 *   columns that both still exist. Neither edit touches a line of
 *   this file, and both change what a stored vector says.
 *
 * `tests/lib/features.test.ts` pins the version against a digest
 * over the key list AND a digest over the neutral term set, so
 * either kind of drift fails naming the bump it needs. Bumping is
 * the cheap half; noticing is the expensive half, which is what the
 * two digests are for.
 *
 * The version travelling WITH a stored vector is the schema's job
 * and it is already there: `documents.feature_version` is the
 * document's half of the pin and `domains.feature_version` is the
 * domain's, and a stored vector is stale exactly when the two
 * differ. That column comment names the featurizer that writes both
 * in one statement or neither; this module is what it calls.
 *
 * ## Absence, and why a known flag exists at all
 *
 * The repo's rule is that `null` is not measured and `0` is
 * measured zero. A numeric vector CANNOT HOLD `null` — every cell
 * is a finite number by construction, because a `NaN`, an infinity
 * or a string is a cell that trains a model on garbage or crashes
 * the trainer's parser, and neither failure names this file.
 *
 * So where the distinction matters the record carries a companion
 * KNOWN FLAG. A declared quantity produces two columns: the value,
 * and `<name>_known`, which is `0` when nothing measured it and the
 * value is then `0` rather than a pretend number. A model can learn
 * "nobody said" only if it is told that is what happened, and a
 * quantity scored as a measured zero takes its place at the bottom
 * of every ordering as though it had been read.
 *
 * The one-hot groups encode the same distinction without a flag,
 * and it is worth reading off the columns rather than assumed: all
 * members zero AND the catch-all zero means nothing was stated,
 * while a catch-all above zero means something was stated that the
 * roster does not name. Those are different facts and the layout
 * keeps them apart.
 *
 * {@link measuredNumber} is where absence is decided, and it is the
 * reading `aggregate-score.ts`'s `toFinite` gives — declared again
 * here rather than imported, because a spliced library imports
 * nothing. {@link asNumber} is the other half and folds absence
 * into `0`; every cell that reaches the record goes through it.
 *
 * ## What this port takes as input, and why
 *
 * THE COLUMN SET IS DERIVED FROM THE DOMAIN'S TERM INPUT. The
 * original froze its vocabularies as literal arrays in the module
 * and argued for it: deriving them would make the column layout
 * move whenever an operator curated a row, which is exactly the
 * moving target a version exists to prevent, and it would move
 * invisibly, because editing a data file reads like data entry
 * rather than like a schema change.
 *
 * That argument is answered here rather than ignored, and the
 * answer is the schema's. A domain's taxonomy is rows, one domain's
 * vocabulary must not be compiled into another domain's vector, and
 * `domains.feature_version` is per domain for exactly this reason —
 * its own column comment says a domain's taxonomy supplies most of
 * what the vector measures, down to the column position a one-hot
 * occupies. So the layout moves with the taxonomy BY DESIGN, and
 * what stops the move being invisible is the version pinning the
 * term set as well as the key list. The original's invisibility
 * problem is real; freezing a lexicon is one answer to it and
 * digesting the input is another, and only the second survives more
 * than one domain.
 *
 * A category column is therefore a fact about the term set handed
 * in, and a hit is attributed to a category BY ITS PATTERN. The
 * ported gate's hits carry pattern, weight and polarity and no
 * category — `static-gate.ts` says why its term shape holds only
 * what the matcher reads — so the term set does double duty here:
 * it supplies the columns AND the mapping from a hit back to the
 * column it belongs in. A hit whose pattern the term set does not
 * name lands in the catch-all rather than being dropped, which is
 * the original's property that the counts always add up to the
 * hits.
 *
 * ## What is kept
 *
 * The version constant and what it is for. The three coercions, to
 * the bit: text, number and column key. The key list as a function
 * that is the single source of the order. The flat record of finite
 * numbers, built by walking that same layout so the two cannot
 * disagree. The known flag for an unmeasured quantity. The one-hot
 * with a catch-all count beside it. The rule that a one-hot reads a
 * value the pipeline STORED and never one inferred from the text.
 * The vector as values in key order, where a key the record is
 * missing reads `0` so a row is always the full width. The text
 * shape signals — length, and how many lines open as list items.
 *
 * The parity leg is KERNEL and it is bounded by the ORIGINAL's
 * export surface rather than by this one: the original exports its
 * rosters, its key list, its extractor and its vector builder, and
 * exports none of its three coercions. So the coercions are
 * compared COMPOSITIONALLY, through the vector builder, which runs
 * the numeric coercion over every cell it reads and is therefore
 * the whole of the adversarial leg. What that cannot see is a pair
 * of errors cancelling between the coercion and the walk, which is
 * why `tests/lib/features.test.ts` drives each coercion on its own
 * as well. Read the two files together; neither is the whole
 * reading.
 *
 * ## What is dropped
 *
 * Every frozen vocabulary, and every column whose meaning was one
 * of their members. The original hand-authored four rosters and the
 * text patterns that read one deployment's subject matter out of a
 * body; none of their members, and no subject matter of any kind,
 * reaches this file, so a search of it says nothing about what any
 * domain measures. What survives is the SHAPE each roster was an
 * instance of — a derived count group, a declared one-hot, and a
 * quantity with a known flag beside it — with the members supplied
 * by a domain.
 *
 * The optional cross-module require is dropped with them. The
 * original reached for a sibling library under a
 * `typeof require !== 'undefined'` guard so that being inlined
 * without it cost two features rather than the whole scan; here the
 * quantities it produced arrive as readings the caller already
 * took, which is the shape a spliced library can have without a
 * guard at all.
 *
 * The compound-sentence pair goes too, and for a different reason:
 * it read a member of the scan the ported gate does not produce.
 * `GateScore` carries a score, a threshold, hits, a decision and
 * warnings, and nothing about co-occurrence within a sentence, so a
 * column for it would be a column of zeros standing for a reading
 * nothing takes.
 *
 * The guarded CommonJS export block at the foot of the original
 * becomes declaration exports, which is what the splice strips and
 * what a Code node can run, and `var` becomes `const`.
 *
 * ## What is preserved deliberately
 *
 * Readings that look like faults until the argument is read. Each
 * has a case of its own in `tests/lib/features.test.ts`.
 *
 * COERCION REFUSES RATHER THAN RAISES. Neither {@link asText} nor
 * {@link asNumber} throws on anything, including a symbol and an
 * object whose own conversion refuses: unreadable text is absent
 * text and an unreadable number is `0`. A run part-way through a
 * corpus must not die on one row. A row pathological beyond that —
 * a getter that throws while the record is being read — is caught
 * one level up by whatever drives the corpus, which refuses the row
 * rather than storing a zeroed vector that would look valid
 * forever.
 *
 * WHITESPACE IS A MEASURED ZERO where an empty cell is absence.
 * `Number(' ')` is `0`, so a quantity arriving as `''` is
 * unmeasured and the same quantity arriving as `' '` reads as a
 * measurement of nothing. The line falls where `Number` puts it
 * rather than where anyone would choose it, and trimming first
 * would move every measurement this module takes.
 *
 * THE RECORD IS A PLAIN OBJECT and that is safe here rather than
 * lucky. `__proto__` is the one key a plain object drops without
 * saying so, and {@link asKey} cannot produce it: a run of
 * non-alphanumeric characters collapses to a SINGLE underscore, so
 * the doubled underscores that key needs are unreachable. Every
 * column name is keyed, so the original's plain `{}` is preserved
 * rather than repaired.
 *
 * A COLUMN CAN BE DROPPED BY COLLISION and the key list is what
 * reports it. Two spec entries whose keyed forms are equal produce
 * one column, first occurrence wins, and the later one is simply
 * absent — two categories written `a-b` and `a b`, a one-hot member
 * literally named `other`, a quantity named `<x>_known` beside a
 * quantity named `<x>`. Nothing is refused and nothing throws,
 * because a spliced library that throws takes a whole run down. The
 * layout is one column shorter and both digests move, which is the
 * artifact that reports it and the reason the version pins the term
 * set at all.
 *
 * Each group's CATCH-ALL IS EMITTED BEFORE ITS MEMBERS, which is
 * the one place the column order departs from the original's. It is
 * what stops a collision losing a reading altogether: membership is
 * tested against the MEMBER COLUMNS the layout planned, so a member
 * that lost its column to the catch-all is counted in the catch-all
 * rather than vanishing from both. For the category group that is
 * also what keeps the counts adding up to the hits.
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
// The version, and what it pins
// ---------------------------------------------------------------------------

/**
 * The version of the vector's MEANING, as this module defines it.
 *
 * Bump it whenever a column is added, removed, renamed or
 * redefined, or whenever the arithmetic behind one changes. It is
 * the mechanism's half of the pin; the domain's half is the term
 * set, which this module cannot version because it does not own it.
 * Both are digested by `tests/lib/features.test.ts`, and a domain's
 * expected version is stored in `domains.feature_version` beside
 * each document's own `documents.feature_version`.
 *
 * Starts at 1 rather than continuing the original's numbering. The
 * columns are not the original's columns and a shared number would
 * claim a comparability that does not exist between two vectors
 * measuring different things.
 */
export const FEATURE_MECHANISM_VERSION = 1;

// ---------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------

/** Shorter, at the one site that builds a pattern from a code point. */
const charFrom = String.fromCharCode;

/**
 * A run of anything a column key may not hold.
 *
 * Applied to already-lowered text, so the class names lower case
 * only and an upper-case letter is not a run to collapse — it has
 * already become its lower-case self by the time this is applied.
 */
const NON_KEY_RUN = /[^a-z0-9]+/g;

/**
 * A line that opens as a list item: a dash, star, plus or bullet,
 * or a one- or two-digit number followed by a dot or a bracket.
 *
 * How many of these a text carries is a SHAPE signal and not a
 * subject-matter one: a wall of prose and a thirty-item list read
 * differently whatever they are about.
 *
 * The bullet glyph is built from its code point rather than written
 * into the source, so this file stays plain ASCII — the same rule
 * every pattern under `src/lib/` follows.
 */
const BULLET_LINE = new RegExp(
  `^\\s*(?:[-*+${charFrom(0x2022)}]|\\d{1,2}[.)])\\s+`,
);

/** A carriage return and line feed, folded before lines are split. */
const CRLF = /\r\n/g;

// ---------------------------------------------------------------------------
// Coercion
// ---------------------------------------------------------------------------

/**
 * A value as text, treating anything unreadable as absent.
 *
 * `String` is not total: an object whose `toString` refuses takes
 * its caller down. A featurizer walking a corpus must not die on
 * one row, so this refuses instead and answers `''` — unreadable
 * text is ABSENT text, which the record can represent.
 *
 * Never throws, and the one input that looks as though it should is
 * a symbol: `String` called as a FUNCTION is special-cased to
 * answer a symbol's description where a template or a `+ ''` would
 * refuse. So the catch below is reached only by a value whose own
 * conversion throws.
 *
 * Takes `unknown` on purpose. The spliced copy runs in a Code node
 * where no type was ever checked.
 *
 * @param value - Anything at all, including nothing.
 * @returns Its text, or `''`.
 */
export function asText(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  try {
    return String(value);
  } catch {
    return '';
  }
}

/**
 * A value as a finite number, treating anything unreadable as `0`.
 *
 * Every cell that reaches the record goes through here. A cell that
 * is `NaN`, an infinity or not a number at all is a cell that will
 * train a model on garbage or crash the trainer's parser, and
 * neither failure names this file — so there is one exit and it is
 * always a finite number.
 *
 * `Number` throws on a symbol, and on an object whose `valueOf` and
 * `toString` both refuse, so this catches for the same reason
 * {@link asText} does.
 *
 * ABSENCE FOLDS INTO ZERO HERE, which is the whole reason the known
 * flags exist: `Number(null)` is `0` and `Number(undefined)` is
 * `NaN`, and neither can say that nothing was measured. Use
 * {@link measuredNumber} wherever that difference is the thing
 * being recorded.
 *
 * @param value - Anything at all, including nothing.
 * @returns A finite number, never `NaN` and never an infinity.
 */
export function asNumber(value: unknown): number {
  let parsed: number;

  try {
    parsed = Number(value);
  } catch {
    return 0;
  }

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

/**
 * A measurement as a finite number, or `null` when there is none.
 *
 * The reader that keeps absence and zero apart, so a known flag has
 * something to report. `null`, `undefined` and `''` are the three
 * ways a pipeline says nothing was measured — a column never
 * written, a key that is not there, and the empty cell a delimited
 * export produces — and there is no reason to distinguish them.
 * Anything that reads as a non-finite number is absent too, since a
 * cell holding a word carries no measurement either.
 *
 * A CELL HOLDING ONLY WHITESPACE IS NOT ABSENT. `Number(' ')` is
 * `0`, so such a cell reads as a measured zero and only the exactly
 * empty string reads as absence. Trimming first would move every
 * quantity this module records, and the line falls where `Number`
 * puts it rather than where anyone chose.
 *
 * NUMERIC STRINGS ARE NUMBERS, which is not a convenience: a driver
 * reading a wide-precision column hands back a string rather than
 * lose digits, so `'7'` is what a measured seven looks like coming
 * out of storage.
 *
 * @param value - Anything at all, including nothing.
 * @returns The finite number it carries, or `null`.
 */
export function measuredNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  let parsed: number;

  try {
    parsed = Number(value);
  } catch {
    return null;
  }

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

/**
 * A name as a column key: lower case, alphanumerics kept, every
 * other run collapsed to one underscore.
 *
 * What turns an operator's category name or quantity name into
 * something a column can be called and a trainer can address.
 *
 * The collapse is what makes the record safe as a plain object. A
 * doubled underscore is unreachable from this — a run of
 * non-alphanumeric characters becomes ONE underscore, whatever its
 * length — so no keyed name can be `__proto__`, which is the single
 * key a plain object would accept and silently drop.
 *
 * It is also where two distinct names can become one column: `a-b`
 * and `a b` both key to `a_b`. See the header on collisions.
 *
 * @param name - Anything at all, including nothing.
 * @returns The keyed form, possibly `''`.
 */
export function asKey(name: unknown): string {
  const lowered = asText(name).toLowerCase();

  return lowered.replace(NON_KEY_RUN, '_');
}

/**
 * A roster member, a stated value or a declared key, as the column
 * suffix it becomes.
 *
 * {@link asKey} with a trim in front of it. The trim is what the
 * original applied to a stored value before comparing it, and it is
 * applied to the ROSTER side here as well so that a member written
 * with stray whitespace still matches the value it names — the
 * original's rosters were clean by authorship, so nothing there
 * distinguished the two sides.
 *
 * @param value - Whatever the spec or the reading holds.
 * @returns The keyed form, `''` when there was nothing to key.
 */
function rosterKey(value: unknown): string {
  const trimmed = asText(value).trim();

  return asKey(trimmed);
}

// ---------------------------------------------------------------------------
// What a caller declares
// ---------------------------------------------------------------------------

/**
 * One term the domain matches on, as this module reads it.
 *
 * Two columns of a `terms` row and nothing else: what was looked
 * for, and which bucket it belongs to. The weight and the polarity
 * are the gate's business and were already spent by the time a hit
 * reaches here, so they are absent for the same reason
 * `static-gate.ts`'s own term shape carries no category — a shape
 * holding what its reader does not read invites a caller to believe
 * it matters.
 *
 * A caller projects this off a join of `terms` onto `categories`,
 * taking the pattern from the term and the key from the category.
 */
export interface FeatureTerm {
  /**
   * The pattern the term states, exactly as the row holds it.
   *
   * Matched against a hit's own `pattern` to decide which category
   * the hit counted for, so it has to be the string the gate was
   * given rather than a normalized form of it.
   */
  readonly pattern: string;

  /**
   * The key of the category this term is filed under.
   *
   * The distinct keyed forms of these are the category columns, in
   * sorted order. See the header on why they are derived rather
   * than frozen.
   */
  readonly category: string;
}

/**
 * One group of mutually comparable values a document may state,
 * with the members the domain expects to see.
 *
 * Produces one column per member, plus a catch-all counting the
 * stated values that no member names. A domain widens the roster
 * in a versioned bump rather than losing the values it has not met
 * yet, which is what the catch-all climbing is the signal for.
 */
export interface FeatureOneHot {
  /**
   * What the group is called: the prefix its columns carry, and the
   * key its stated values are filed under in a reading.
   */
  readonly key: string;

  /**
   * Every member the roster names. Sorted and deduplicated by this
   * module rather than taken in the order given, so a column cannot
   * move because a JSON object held its keys differently.
   */
  readonly members: readonly string[];
}

/**
 * A domain's whole feature layout, as this module needs it.
 *
 * Everything that decides which columns exist. Nothing here is a
 * measurement: a spec and a reading are separate arguments so that
 * a layout can be built once for a domain and reused across every
 * document in a run, which is also what makes the key list
 * derivable without a document in hand.
 */
export interface FeatureSpec {
  /**
   * The domain's term set. Supplies the category columns AND the
   * mapping from a hit's pattern back to the column it counts for.
   */
  readonly terms: readonly FeatureTerm[];

  /**
   * Every quantity the pipeline may measure, by the key it is filed
   * under in a reading. Each produces a value column and a known
   * flag beside it.
   */
  readonly quantities: readonly string[];

  /** Every one-hot group, in the order their column blocks appear. */
  readonly oneHots: readonly FeatureOneHot[];
}

/**
 * The document-side readings a vector is computed from.
 *
 * Every member is optional and every absence is defined, so a
 * reading that carries nothing still produces a full-width record
 * of zeros with every known flag down — which is the honest vector
 * for a document nothing has been measured on, and is different
 * from having no vector at all.
 */
export interface FeatureReading {
  /**
   * The prepared text the gate scored, which is the only thing the
   * shape columns are computed over.
   *
   * A chunk rather than a raw body: what is measured has to be what
   * was read, or the length column describes a document the rest of
   * the pipeline never saw.
   */
  readonly text?: unknown;

  /**
   * Every quantity that was measured, keyed as
   * {@link FeatureSpec.quantities} names them.
   *
   * A key that is absent, `null` or `''` is a quantity nothing
   * measured, and its known flag says so. See
   * {@link measuredNumber}.
   */
  readonly quantities?: unknown;

  /**
   * What the document STATED, keyed by one-hot group.
   *
   * Each entry is a value or a list of values. Stated is the whole
   * of it: these are read from what the pipeline stored because a
   * source said it, never inferred from the text, because a feature
   * that guessed would hand a model a fact the corpus does not
   * contain and nothing downstream could tell the two apart.
   */
  readonly stated?: unknown;
}

/**
 * The part of a gate result this module reads.
 *
 * Declared here rather than imported from `src/lib/static-gate.ts`,
 * for the reason the header gives about a spliced library importing
 * nothing. A real `GateScore` satisfies it structurally, and so
 * does the plain object a Code node hands across a workflow
 * connection.
 */
export interface FeatureGate {
  /** The score the gate summed, which is a measurement. */
  readonly score?: unknown;

  /** Every term the gate found present. */
  readonly hits?: unknown;
}

// ---------------------------------------------------------------------------
// The layout
// ---------------------------------------------------------------------------

/**
 * Every kind of column this module emits, which is the whole
 * mechanism inventory.
 *
 * A column's kind is what {@link extractFeatures} switches on, so
 * this tuple and that switch are the same list read twice. Adding a
 * member is a change to the vector's meaning and therefore a
 * {@link FEATURE_MECHANISM_VERSION} bump.
 */
export const FEATURE_COLUMN_KINDS = [
  'gate-score',
  'category-other',
  'category-count',
  'quantity-value',
  'quantity-known',
  'stated-other',
  'stated-member',
  'text-length',
  'text-bullet-lines',
] as const;

/** One member of {@link FEATURE_COLUMN_KINDS}. */
export type FeatureColumnKind = (typeof FEATURE_COLUMN_KINDS)[number];

/**
 * One column of the vector: its name, what it counts, and where its
 * value comes from.
 *
 * The layout is a value rather than a shape implied by the code
 * that walks it, which is what lets the key list and the record be
 * built from ONE declaration. {@link featureKeys} is this list's
 * keys and {@link extractFeatures} walks the same list, so the two
 * cannot disagree about order, about how many columns there are, or
 * about which spec entry a column stands for.
 */
export interface FeatureColumn {
  /**
   * The column name, as it appears in the record and in the key
   * list. Always carries its group's prefix; see the header on why
   * a bare key would break the record's ordering.
   */
  readonly key: string;

  /** What this column counts. */
  readonly kind: FeatureColumnKind;

  /**
   * Which spec entry supplies its values, as the spec spells it: a
   * quantity key, or a one-hot group key. `''` for a column that
   * reads a fixed place.
   */
  readonly reads: string;

  /**
   * Which roster member it stands for, in keyed form. `''` for a
   * catch-all and for a column that stands for no member.
   */
  readonly member: string;
}

/** The prefix each group's columns carry. */
const GATE_PREFIX = 'gate_';

/** The prefix the derived category columns carry. */
const CATEGORY_PREFIX = 'category_';

/** The prefix the declared quantity columns carry. */
const QUANTITY_PREFIX = 'quantity_';

/** The prefix the one-hot columns carry, ahead of the group key. */
const STATED_PREFIX = 'stated_';

/** The suffix that marks a quantity's companion known flag. */
const KNOWN_SUFFIX = '_known';

/** The suffix a group's catch-all column carries. */
const OTHER_SUFFIX = 'other';

/**
 * A roster as columns are ordered by: keyed, deduplicated, sorted.
 *
 * Sorted rather than kept in the order it arrived, because none of
 * these rosters arrives in an order anyone decided — terms are rows
 * a query returned, and a declared list may have come from a JSON
 * object's keys. A column that could move because of either is not
 * a column the version can pin.
 *
 * Sorted on the KEYED form, so the order is the order of the names
 * that will actually appear, and two names that key alike collapse
 * to one column here rather than colliding later.
 *
 * @param names - Whatever the spec listed.
 * @returns The keyed names, unique, in ascending order.
 */
function keyedRoster(names: readonly unknown[]): readonly string[] {
  const keyed = names.map((name) => rosterKey(name));

  return Array.from(new Set(keyed)).sort();
}

/**
 * Every category the term set names, as columns are ordered by.
 *
 * The derived half of the layout: hand it a domain's terms and it
 * answers the category columns that will exist, in their column
 * order, without a document in hand.
 *
 * Every category a term names gets a column, including one whose
 * only term states no pattern and can therefore never be matched.
 * That column stays `0`, and it is deliberate: the layout is a fact
 * about the taxonomy, so repairing a malformed pattern later fixes
 * the counting without moving a single column.
 *
 * @param terms - The domain's term set.
 * @returns The keyed category names, unique, in ascending order.
 */
export function featureCategories(
  terms: readonly FeatureTerm[],
): readonly string[] {
  return keyedRoster(terms.map((term) => term.category));
}

/**
 * The vector's layout for one domain: every column, in order.
 *
 * The group order is frozen here and is part of what the version
 * pins: the gate's score, the derived category counts, the declared
 * quantities with their known flags, the one-hot groups in the
 * order the spec lists them, and the text shape signals last.
 *
 * Within each group the CATCH-ALL COMES FIRST. That is the one
 * ordering choice that carries behaviour rather than taste: a
 * member whose keyed name collides with the catch-all loses its own
 * column, and because {@link extractFeatures} tests membership
 * against the columns planned here, its values are counted in the
 * catch-all instead of disappearing from both. The counts always
 * add up to what was read, which is the whole reason a catch-all
 * exists.
 *
 * A duplicate key is dropped, first occurrence wins, and nothing is
 * refused — see the header on why a spliced library does not throw
 * over a spec it dislikes, and on the digests that report it.
 *
 * @param spec - The domain's layout.
 * @returns Every column, in the order the record writes them.
 */
export function featureColumns(spec: FeatureSpec): readonly FeatureColumn[] {
  const planned: FeatureColumn[] = [];
  const taken = new Set<string>();
  const add = (column: FeatureColumn): void => {
    if (taken.has(column.key)) {
      return;
    }

    taken.add(column.key);
    planned.push(column);
  };

  add({
    key: `${GATE_PREFIX}score`,
    kind: 'gate-score',
    reads: '',
    member: '',
  });

  add({
    key: `${CATEGORY_PREFIX}${OTHER_SUFFIX}`,
    kind: 'category-other',
    reads: '',
    member: '',
  });

  for (const category of featureCategories(spec.terms)) {
    add({
      key: `${CATEGORY_PREFIX}${category}`,
      kind: 'category-count',
      reads: '',
      member: category,
    });
  }

  for (const quantity of spec.quantities) {
    const keyed = rosterKey(quantity);

    add({
      key: `${QUANTITY_PREFIX}${keyed}`,
      kind: 'quantity-value',
      reads: quantity,
      member: '',
    });
    add({
      key: `${QUANTITY_PREFIX}${keyed}${KNOWN_SUFFIX}`,
      kind: 'quantity-known',
      reads: quantity,
      member: '',
    });
  }

  for (const group of spec.oneHots) {
    const prefix = `${STATED_PREFIX}${rosterKey(group.key)}_`;

    add({
      key: `${prefix}${OTHER_SUFFIX}`,
      kind: 'stated-other',
      reads: group.key,
      member: '',
    });

    for (const member of keyedRoster(group.members)) {
      add({
        key: `${prefix}${member}`,
        kind: 'stated-member',
        reads: group.key,
        member,
      });
    }
  }

  add({ key: 'text_length', kind: 'text-length', reads: '', member: '' });
  add({
    key: 'text_bullet_lines',
    kind: 'text-bullet-lines',
    reads: '',
    member: '',
  });

  return planned;
}

/**
 * The key list, in order.
 *
 * What a trainer needs to build a matrix and what a test needs to
 * pin the width, both read off {@link featureColumns} so a column
 * can never mean two things in two places. It is also one of the
 * two inputs {@link FEATURE_MECHANISM_VERSION} pins, which is why
 * it is derivable from a spec alone: a digest over this list is
 * takeable without a document, a database or a run.
 *
 * @param spec - The domain's layout.
 * @returns Every column name, in the record's key order.
 */
export function featureKeys(spec: FeatureSpec): readonly string[] {
  return featureColumns(spec).map((column) => column.key);
}

// ---------------------------------------------------------------------------
// Reading the inputs
// ---------------------------------------------------------------------------

/**
 * Whatever arrived, as something a key can be read off.
 *
 * Written as the original wrote it: anything that is not an object
 * becomes an empty one, so a reading that arrived as a string, a
 * number or nothing at all still produces a full-width record
 * rather than raising part-way through a corpus.
 *
 * @param value - Whatever the caller passed.
 * @returns Something a key can be read off.
 */
function objectOf(value: unknown): Record<string, unknown> {
  return (value !== null && typeof value === 'object'
    ? value
    : {}) as Record<string, unknown>;
}

/**
 * Which category each pattern counts for.
 *
 * The term set doing its second job: the ported gate reports a hit
 * as a pattern, a weight and a polarity, so the only route from a
 * hit back to a column is the pattern the operator wrote.
 *
 * First occurrence wins. A pattern filed under two categories is a
 * taxonomy fault this module cannot resolve — counting it twice
 * would make the counts exceed the hits, and dropping it would make
 * them fall short — so it counts for the first category the term
 * set names. A term stating no pattern is skipped, which is what
 * keeps a hit that carries no pattern out of it rather than
 * attributed to whichever term also had none.
 *
 * @param terms - The domain's term set.
 * @returns Pattern to keyed category.
 */
function patternCategories(
  terms: readonly FeatureTerm[],
): Map<string, string> {
  const byPattern = new Map<string, string>();

  for (const term of terms) {
    const pattern = asText(term.pattern);

    if (pattern !== '' && !byPattern.has(pattern)) {
      byPattern.set(pattern, rosterKey(term.category));
    }
  }

  return byPattern;
}

/**
 * Every stated value a reading holds for one group, keyed.
 *
 * A list, a single value or nothing: a group is stated as one value
 * far more often than as several, and requiring a list of one would
 * make every caller wrap. Values that key to nothing are dropped,
 * which is the original's reading of an empty stored slug.
 *
 * @param value - Whatever the reading filed under the group key.
 * @returns The keyed values, in the order they were stated.
 */
function statedValues(value: unknown): readonly string[] {
  const listed = Array.isArray(value)
    ? (value as readonly unknown[])
    : [value];

  return listed
    .map((entry) => rosterKey(entry))
    .filter((entry) => entry !== '');
}

/**
 * How many lines of a text open as a list item.
 *
 * Line endings are folded before the split, so a text stored with
 * carriage returns counts the same as the same text without them.
 *
 * @param text - The prepared text.
 * @returns The count, which is a measurement and never absent.
 */
function bulletLines(text: string): number {
  const folded = text.replace(CRLF, '\n');

  return folded.split('\n')
    .filter((line) => BULLET_LINE.test(line))
    .length;
}

// ---------------------------------------------------------------------------
// The extractor
// ---------------------------------------------------------------------------

/**
 * Compute a document's feature vector as a flat record.
 *
 * One document in, one record of finite numbers out, with exactly
 * the keys {@link featureKeys} lists for the same spec and in the
 * same order. Both walk {@link featureColumns}, so the record and
 * the key list are one declaration read twice rather than two lists
 * that have to be kept in step.
 *
 * Nothing here raises. Every reading is coerced, an input of the
 * wrong shape reads as an input that stated nothing, and a document
 * that carries none of the three readings still comes back a
 * full-width record of zeros with every known flag down. That is
 * the honest vector for a document nothing measured, and it is a
 * different fact from `documents.features` being NULL, which says
 * no featurizer has ever reached the row.
 *
 * WHAT EACH GROUP COUNTS:
 *
 * - The gate's score, coerced. A score is a measurement the gate
 *   always takes, so there is no flag beside it.
 * - One count per derived category, plus a catch-all. A hit is
 *   attributed by its pattern; a hit whose pattern the term set
 *   does not name, or which names a category that lost its column,
 *   is counted in the catch-all. The counts always add up to the
 *   hits.
 * - One value and one known flag per declared quantity. An
 *   unmeasured quantity is `0` with its flag `0`; see
 *   {@link measuredNumber} for where that line falls.
 * - One 0/1 per one-hot member, plus a catch-all counting the
 *   stated values no member names. All members zero AND the
 *   catch-all zero means nothing was stated.
 * - The text's length and how many of its lines open as list items.
 *
 * @param reading - The document-side readings, as
 * {@link FeatureReading} shapes them. Anything that is not an object
 * is read as a document that stated nothing.
 * @param gate - The gate result, as {@link FeatureGate} shapes it.
 * Anything that is not an object is read as a score of zero and no
 * hits.
 * @param spec - The domain's layout.
 * @returns A flat record of finite numbers, in key order.
 */
export function extractFeatures(
  reading: unknown,
  gate: unknown,
  spec: FeatureSpec,
): Record<string, number> {
  const columns = featureColumns(spec);
  const read = objectOf(reading);
  const scored = objectOf(gate);
  const text = asText(read.text);
  const quantities = objectOf(read.quantities);
  const stated = objectOf(read.stated);

  // Every count the walk below reads, taken once. A second read of
  // the same key would run a caller's getter twice, and the whole
  // point of the walk is that each column is written once.
  const counts = new Map<string, number>();
  const bump = (key: string): void => {
    counts.set(key, (counts.get(key) ?? 0) + 1);
  };

  const categoryOf = patternCategories(spec.terms);
  const categoryColumns = new Map<string, string>();

  for (const column of columns) {
    if (column.kind === 'category-count') {
      categoryColumns.set(column.member, column.key);
    }
  }

  const hits = Array.isArray(scored.hits)
    ? (scored.hits as readonly unknown[])
    : [];

  for (const hit of hits) {
    const pattern = asText(objectOf(hit).pattern);
    const category = categoryOf.get(pattern) ?? '';
    const column = categoryColumns.get(category);

    bump(column ?? `${CATEGORY_PREFIX}${OTHER_SUFFIX}`);
  }

  for (const group of spec.oneHots) {
    const prefix = `${STATED_PREFIX}${rosterKey(group.key)}_`;
    const otherKey = `${prefix}${OTHER_SUFFIX}`;
    const members = new Set(keyedRoster(group.members)
      .map((member) => `${prefix}${member}`)
      .filter((key) => key !== otherKey));

    for (const value of statedValues(stated[group.key])) {
      const key = `${prefix}${value}`;

      if (members.has(key)) {
        counts.set(key, 1);
      } else {
        bump(otherKey);
      }
    }
  }

  const measured = new Map<string, number | null>();

  for (const quantity of spec.quantities) {
    if (!measured.has(quantity)) {
      measured.set(quantity, measuredNumber(quantities[quantity]));
    }
  }

  const out: Record<string, number> = {};

  for (const column of columns) {
    out[column.key] = columnValue(column, {
      counts,
      measured,
      score: scored.score,
      text,
    });
  }

  return out;
}

/**
 * Everything {@link columnValue} reads, gathered once per document.
 *
 * A parameter object rather than five positional arguments, so the
 * switch below reads as a table of what each kind of column is and
 * not as a call whose arguments have to be counted.
 */
interface ColumnInputs {
  /** Every count the pass over hits and stated values took. */
  readonly counts: Map<string, number>;

  /** Every declared quantity, by its declared key. */
  readonly measured: Map<string, number | null>;

  /** The gate's score, as it arrived. */
  readonly score: unknown;

  /** The prepared text, coerced. */
  readonly text: string;
}

/**
 * One column's value.
 *
 * Split out so the walk over {@link featureColumns} stays a walk:
 * the switch here is the same list as {@link FEATURE_COLUMN_KINDS}
 * read a second time, which is what makes adding a kind a change
 * that will not compile until it is handled.
 *
 * A count that was never taken reads `0`, which is a measured zero
 * and not an absence — the pass over the hits ran, and this column
 * is what it found none of.
 *
 * @param column - The column, from the layout.
 * @param inputs - Everything gathered for this document.
 * @returns A finite number.
 */
function columnValue(column: FeatureColumn, inputs: ColumnInputs): number {
  switch (column.kind) {
    case 'gate-score':
      return asNumber(inputs.score);

    case 'category-other':
    case 'category-count':
    case 'stated-other':
    case 'stated-member':
      return inputs.counts.get(column.key) ?? 0;

    case 'quantity-value': {
      const value = inputs.measured.get(column.reads) ?? null;

      return value === null
        ? 0
        : asNumber(value);
    }

    case 'quantity-known':
      return (inputs.measured.get(column.reads) ?? null) === null
        ? 0
        : 1;

    case 'text-length':
      return inputs.text.length;

    case 'text-bullet-lines':
      return bulletLines(inputs.text);
  }
}

/**
 * A record's values in key order: the row a trainer turns into a
 * matrix.
 *
 * Takes the key list rather than deriving one, and that is the
 * point of it. A stored vector was computed under the layout its
 * `documents.feature_version` names, so rebuilding a row for
 * comparison means building it against THAT key list and not
 * against whatever the domain's spec derives today. Handing the
 * list in is what makes the version pin usable instead of
 * decorative.
 *
 * A key the record is missing reads `0` rather than `undefined`, so
 * a row is always the full width — a matrix with a ragged row is
 * not a matrix, and the failure would surface in the trainer rather
 * than here.
 *
 * @param record - The record, or anything at all.
 * @param keys - The key list the vector is built against.
 * @returns One finite number per key, in key order.
 */
export function featureVector(
  record: unknown,
  keys: readonly string[],
): readonly number[] {
  const values = objectOf(record);

  return keys.map((key) => asNumber(values[key]));
}
