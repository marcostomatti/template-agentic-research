/**
 * @packageDocumentation
 * feature-version — the one integer `documents.feature_version`
 * stores, composed from BOTH inputs a stored vector's meaning
 * depends on.
 *
 * A feature vector is derived data. It is computed once, written to
 * a row, and read back weeks later beside vectors computed under
 * some other configuration, where nothing about the numbers says
 * which generation they belong to. `features.ts` produces the
 * vector; this module produces the number that says what it is
 * comparable WITH.
 *
 * ## Neither input alone is sufficient
 *
 * Two things move a vector's meaning, and they move independently.
 *
 * THE MECHANISM is `features.ts`'s own layout: which columns exist,
 * in what order, and what each one counts.
 * `FEATURE_MECHANISM_VERSION` is its version, bumped by whoever
 * edits that file. A mechanism bump under a STALE TERM SET is a
 * real event and not a hypothetical one — a column inserted in the
 * middle re-indexes every stored vector while every `terms` row
 * sits exactly where it was, so a one-hot at position 34 now stands
 * for the member that used to sit at 33.
 *
 * THE TERM SET is the domain's own `terms` rows, and it supplies
 * most of what the vector measures. Adding a term under a new
 * category inserts a column; re-filing a term moves counts between
 * two columns that both still exist; editing a weight or a polarity
 * moves the gate score the vector carries as its first column. A
 * TERM CHANGE UNDER A STABLE MECHANISM touches no line of
 * `features.ts` and changes what every stored vector says.
 *
 * Both of those produce vectors that must not be compared, and a
 * version derived from either input alone certifies one of them as
 * current. That is the whole reason this module exists rather than
 * `documents.feature_version` simply holding
 * `FEATURE_MECHANISM_VERSION`.
 *
 * ## `FEATURE_MECHANISM_VERSION` is passed in, never imported
 *
 * It lives in `features.ts` — beside the layout it versions, which
 * is the only place a reader editing a column will see it — and
 * arrives here as {@link featureVersionFor}'s first argument. The
 * splice rule is what forces that rather than an import: a library
 * that imports anything cannot be inlined into a Code node, and
 * `assertSpliceable` in `scripts/workflow-markers.ts` refuses the
 * import at build time rather than shipping an artifact that fails
 * on an instance. A Code node computing a vector therefore carries
 * both markers and wires the two together in its own body, which is
 * the only place they can meet.
 *
 * The same rule is why the digest below is FNV-1a written out over
 * `BigInt` instead of a one-line `node:crypto` call: a Code node
 * resolves no specifier at all, so there is nothing there for that
 * import to resolve ON. `shingle.ts` carries the identical
 * arithmetic for the identical reason, and the two are deliberately
 * separate copies — a shared one would need the import the splice
 * rule forbids.
 *
 * ## The pin no column held
 *
 * `.specs/2026-08-19-integration-followups.md` item 19 records the
 * gap this closes. What landed before this file was the mechanism
 * half as a constant in `features.ts` and the domain half as a
 * digest inside `tests/lib/features.test.ts` — taken over a term
 * set authored in that test, so it reddens when the fixture moves
 * and sees nothing at all about a deployed domain's rows. Nothing
 * else saw it either: `categories`, `terms` and `criteria` carry no
 * timestamps, so a re-filed term left no trace a recompute could
 * read, and bumping `domains.feature_version` by hand was the whole
 * enforcement.
 *
 * This is the runtime half of that pin, and it needs no migration
 * to land: the composed integer IS the fingerprint, carried in the
 * low bits of the two columns that already exist. A domain whose
 * `domains.feature_version` differs from a document's
 * `documents.feature_version` is a domain whose vectors are stale,
 * and now that comparison moves when an operator edits a row rather
 * than when somebody remembers to bump a number.
 *
 * ## The layout of the integer, and why it fits
 *
 * Both columns are a Postgres `integer`, which is signed and 32
 * bits, so the composed value has 31 bits to live in. It is split
 * into a high byte and the rest:
 *
 * ```text
 * value = mechanismVersion * TERM_DIGEST_SPAN + termSetDigest
 * ```
 *
 * with the mechanism version bounded at
 * {@link MAX_FEATURE_MECHANISM_VERSION} and the digest folded into
 * {@link TERM_DIGEST_SPAN} values. Those two constants are 255 and
 * 2 to the 23rd, and the split is not arbitrary: the largest value
 * the composition can produce is exactly
 * {@link MAX_FEATURE_VERSION}, the largest number the column holds.
 * A case pins that equality, because it is the claim that says no
 * composed version can ever overflow the column it is written to.
 *
 * Two properties fall out of composing rather than hashing the two
 * inputs together. A MECHANISM BUMP CAN NEVER COLLIDE — the high
 * bits are the version itself, so 1 and 2 land in disjoint bands
 * whatever their term sets digest to, and a developer's deliberate
 * bump is the one signal that is never lost to arithmetic. And the
 * mechanism version is READABLE back out of a stored value, which
 * is what lets an operator staring at a number tell a layout
 * generation from a taxonomy edit without re-running anything.
 *
 * A composed version is never `0` and never negative, which matters
 * because both column comments reserve NULL for never-featurized
 * and say that writing `0` would claim a vector computed under a
 * scheme that never existed. The mechanism version is refused below
 * `1`, so the smallest value this can answer is
 * {@link TERM_DIGEST_SPAN} itself.
 *
 * ## What is digested, and what deliberately is not
 *
 * Four members of a `terms` row, and they are the four a vector
 * actually reads: the CATEGORY KEY the term is filed under, the
 * PATTERN it matches on, its WEIGHT and its POLARITY. The first
 * decides which column a hit counts for and whether that column
 * exists at all; the other three decide the gate score the vector
 * opens with.
 *
 * Category is in the set even though it is not among the three
 * columns a matcher reads, and it is the member most easily left
 * out. `features.ts` derives its category columns from these rows
 * and its own header names re-filing as a drift its key list cannot
 * see — a pattern moved between two categories that both still
 * exist changes which column counts it while every column name
 * stays put. A digest without the category is blind to exactly the
 * drift the term-set half of this pin exists for.
 *
 * `notes` is NOT digested, and neither is any other member a caller
 * hands in: a row is read by the four names below and nothing else,
 * so passing whole `terms` rows is the expected call rather than a
 * projection somebody has to remember. Leaving prose out is a
 * decision rather than an oversight. A detector that fires on a
 * comment demands a corpus-wide recompute for an edit that moved no
 * number, and a detector that demands recomputes nobody needs
 * teaches people to bump the version without running one — which is
 * strictly worse than having no detector.
 *
 * `id` and `category_id` are out for the same reason in reverse: a
 * surrogate key that moved under a reseed changes no reading, and a
 * version that moved with it would discard a corpus that was still
 * comparable. The category is digested by its KEY, which is what
 * `features.ts` builds a column name from.
 *
 * ## A canonical form, so equal term sets digest equally
 *
 * {@link termSetCanonicalText} is the whole of the canonicalization
 * and it is exported, because the digest is a number and a number
 * cannot say what moved. Two runs disagreeing about a version are
 * diagnosed by diffing the two texts.
 *
 * ORDER IS NOT PART OF THE INPUT. A term set arrives from a query,
 * and a query without an ORDER BY returns rows in whatever order
 * the plan produced — so a version that moved with the row order
 * would report a recompute after an unrelated index change. The
 * lines are sorted, by the default sort, which compares UTF-16 code
 * units and is the same everywhere. Never `localeCompare` here: it
 * answers differently under different locales, which would make a
 * stored version a property of the machine that wrote it.
 *
 * MULTIPLICITY IS. Two identical rows are two lines, not one. The
 * `terms_category_id_pattern_unique` key means the table cannot
 * hold them, but a join can produce them, and a gate handed the
 * same term twice counts it twice — so a duplicated row is a
 * different term set and gets a different version.
 *
 * SEPARATORS ARE ESCAPED, which is what makes the rendering
 * injective. Fields are joined with a tab and lines with a
 * newline, and `pattern` is `text` a person typed, so it can hold
 * either. Backslash, tab, carriage return and newline are escaped
 * in every field before the join. Without that step a pattern
 * holding a tab renders exactly like the two fields it splits into,
 * and two different term sets share one version — which is the one
 * failure a version pin must not have.
 *
 * The BACKSLASH is in that set for a reason of its own, and it is
 * the easy one to leave out: it is what the other three escapes are
 * spelled with, so a field holding a literal backslash followed by
 * a `t` renders exactly like a field holding a tab unless the
 * backslash is escaped as well. What keeps the escapes it
 * introduces from being escaped again is that the whole field is
 * rewritten in ONE pass over the original — not the order the four
 * are tested in, which was measured to change nothing.
 *
 * A NUMBER IS DIGESTED BY VALUE, not by representation. A weight of
 * `1` and a weight of `'1'` are not both accepted — the second is
 * refused below — but `-0` and `0` ARE the same term here, because
 * the gate takes a weight's magnitude and cannot express the
 * difference. A version that moved between them would demand a
 * corpus-wide recompute for a difference no vector can carry, which
 * is the JSON round trip in `documents.raw` reporting itself as a
 * taxonomy edit.
 *
 * ## What it refuses, and what it deliberately does not judge
 *
 * The line is READABILITY, not correctness. A polarity spelled
 * wrongly is digested, not refused: `static-gate.ts` warns about
 * one and carries on scoring, so a domain holding that row produces
 * vectors, and the version has to name the configuration those
 * vectors were computed under — including the typo, so that fixing
 * it moves the number. {@link FeatureVersionTerm.polarity} is
 * therefore a `string` and not the three-member union
 * `static-gate.ts` programs against, and that difference is the
 * design rather than drift between two files.
 *
 * What IS refused is a term this module cannot render: a member
 * absent, or arriving as a type the column cannot hold. That is a
 * throw rather than a skip or a fallback, and the reason is the one
 * `source-health.ts` gives for its own refusal — nothing downstream
 * undoes it. A version composed over a term set read wrongly is a
 * well-formed integer written to `documents.feature_version`, where
 * every later pass reads it as a vector that is current, and no
 * recompute ever revisits it. A refusal costs one pass and names
 * the row.
 *
 * The refusal names the member and the row's position in the list
 * as it was GIVEN, before the sort, and never the value. That is
 * the no-echo vocabulary `parser-config.ts` and `capture-contract.ts`
 * use, and here it costs nothing to keep: the position locates the
 * row exactly, where a pattern would not — two rows may carry the
 * same one. The mechanism version is the one value that IS named,
 * because it is a number an operator or a developer passed and the
 * rule it broke is unreadable without it.
 *
 * ## A fingerprint, not a proof
 *
 * {@link TERM_DIGEST_SPAN} values is about eight million, so two
 * different term sets can land on one digest at roughly one chance
 * in eight million per pair compared. That is a fingerprint and it
 * is stated rather than implied: the failure it admits is a stale
 * vector reading as current, and the alternative — a wider digest —
 * does not fit the column. A mechanism bump is not exposed to it at
 * all, for the reason the layout section gives.
 *
 * The digest is FNV-1a over the canonical text's UTF-16 code units,
 * folded into the span by taking it modulo a power of two, which is
 * its low bits — where FNV-1a's mixing is. It is not a
 * cryptographic digest and nothing here depends on it being one: an
 * operator who can edit `terms` can already write any version they
 * like into the column.
 *
 * ## Dual context
 *
 * Like every module under `src/lib/`, this one is imported by the
 * default suite AND spliced into a workflow Code node body by
 * `scripts/build-workflows.ts`. So it imports nothing, keeps no
 * state between calls, reaches for no global beyond the language
 * itself, and takes everything it reads as an argument.
 * `tests/build/lib-splice.test.ts` registers it and reads what a
 * real build made of it; `tests/lib/feature-version.test.ts` drives
 * it directly.
 */

// ---------------------------------------------------------------------------
// The layout of the composed integer
// ---------------------------------------------------------------------------

/**
 * How many distinct values the term digest may take, and the stride
 * between two mechanism versions.
 *
 * One constant doing both jobs, so the two halves of the
 * composition cannot drift: the digest is folded into this many
 * values and the mechanism version is multiplied by the same
 * number, which is what makes the bands disjoint.
 *
 * Two to the 23rd. A power of two so the fold is the hash's low
 * bits, and 23 specifically because the mechanism version takes the
 * byte above it and the column has 31 bits to give — see
 * {@link MAX_FEATURE_VERSION}, which is the sum those two choices
 * add up to.
 */
export const TERM_DIGEST_SPAN = 8388608;

/**
 * The largest mechanism version this composition can carry.
 *
 * A byte, less the zero that {@link featureVersionFor} refuses. It
 * is a ceiling on how many times `features.ts` may redefine its
 * layout, and 255 of those is a great many: each one is a corpus-
 * wide recompute somebody has to run. Raising it costs bits the
 * digest currently holds, which is a decision with a collision rate
 * attached rather than a constant to edit.
 */
export const MAX_FEATURE_MECHANISM_VERSION = 255;

/**
 * The largest value {@link featureVersionFor} can answer, which is
 * also the largest value the column holds.
 *
 * `documents.feature_version` and `domains.feature_version` are
 * both a Postgres `integer` — signed, 32 bits — so this is two to
 * the 31st less one, and the equality between that and
 * `MAX_FEATURE_MECHANISM_VERSION * TERM_DIGEST_SPAN
 * + TERM_DIGEST_SPAN - 1` is what says no composed version can
 * overflow what it is written to. A case pins it rather than this
 * comment: the three constants are editable independently and only
 * an assertion notices when they stop adding up.
 */
export const MAX_FEATURE_VERSION = 2147483647;

// ---------------------------------------------------------------------------
// What a caller declares
// ---------------------------------------------------------------------------

/**
 * One `terms` row, projected onto the four members a stored vector
 * depends on.
 *
 * A caller selecting a domain's terms joins them to their category
 * and projects onto this shape. Extra members are ignored rather
 * than refused, so handing whole rows in is the expected call: the
 * header says which four are read and why the rest are not.
 */
export interface FeatureVersionTerm {
  /**
   * The key of the category this term is filed under — the same key
   * `features.ts` builds a column name from, never the surrogate
   * `category_id`.
   */
  readonly category: string;

  /** What the row looks for, as the text an operator wrote. */
  readonly pattern: string;

  /**
   * How much a match is worth. Digested by value, so `-0` and `0`
   * are one term: the gate reads a magnitude and cannot express the
   * difference between them.
   */
  readonly weight: number;

  /**
   * Which way a match moves the score.
   *
   * A `string` rather than the three-member union `static-gate.ts`
   * programs against, deliberately. Nothing here judges a polarity
   * — see the header — and a union would turn a spelling this
   * module has to fingerprint into one it refuses.
   */
  readonly polarity: string;
}

// ---------------------------------------------------------------------------
// The sentences a refusal is built from
// ---------------------------------------------------------------------------

/**
 * Every way one term can be unreadable, as the predicate a refusal
 * puts after the row it names.
 *
 * Collected here rather than written at the call sites so the five
 * are auditable in one place. Not exported: the suite declares the
 * roster itself and holds it against what the cases produce, which
 * fails naming a sentence nothing reaches, where a suite reading
 * them off this object would agree with any edit to them.
 *
 * No entry may END WITH another, or one report satisfies two of
 * them and a roster case attributes a fault to the wrong entry.
 * That is why the three text faults name their member first rather
 * than sharing a `carries a value that is not a string` tail.
 */
const TERM_FAULTS = {
  /** Not a row at all — a scalar, a null, or a missing element. */
  notAnObject: 'is not an object',

  /** The category key, which decides which column a hit counts for. */
  category: 'carries a category key that is not a string',

  /** The pattern, which is what a match is looked for by. */
  pattern: 'carries a pattern that is not a string',

  /** The weight, which the gate score is arithmetic over. */
  weight: 'carries a weight that is not a finite number',

  /** The polarity, which decides whether that weight adds or takes. */
  polarity: 'carries a polarity that is not a string',
} as const;

/**
 * The refusal one unreadable term produces.
 *
 * The position is into the list as it was GIVEN, before the sort,
 * because that is the list the caller can act on. The value is not
 * named, for the reason the header gives: the position locates the
 * row and a pattern would not.
 *
 * @param index - Where the term sat in the list as given.
 * @param fault - Which member could not be read, from
 * {@link TERM_FAULTS}.
 * @returns The whole message.
 */
function refusedTerm(index: number, fault: string): string {
  return `[feature-version] term ${index} of the set ${fault}. ` +
    'A version composed over a term set this module could not read ' +
    'pins nothing, and it is written into documents.feature_version, ' +
    'where every later pass reads it as a vector that is current.';
}

/**
 * The refusal a mechanism version outside the band produces.
 *
 * The one refusal that names its value, and only when that value is
 * a number: rendering an arbitrary one would mean converting
 * something this module has not narrowed, which is the conversion
 * it claims never to do.
 *
 * @param value - Whatever the caller passed.
 * @returns The whole message.
 */
function refusedMechanism(value: number): string {
  const named = typeof value === 'number'
    ? `not ${value}`
    : `and a value of type ${typeof value} is not one`;

  return '[feature-version] the mechanism version must be an integer ' +
    `between 1 and ${MAX_FEATURE_MECHANISM_VERSION}, ${named}. ` +
    'It is composed into the high bits of the one integer ' +
    'documents.feature_version stores, so a version outside the band ' +
    'either lands on another mechanism generation or overflows the ' +
    'column, and no later pass corrects either.';
}

// ---------------------------------------------------------------------------
// The canonical form
// ---------------------------------------------------------------------------

/**
 * Every character a field is escaped for: the two separators, the
 * carriage return that rides with one of them, and the backslash
 * the escapes themselves are written with.
 *
 * A `g` regular expression at module scope, which carries a
 * `lastIndex` between calls — legal here and only here because it
 * is used through `String.prototype.replace`, which resets that
 * index itself. A `test` or an `exec` on this constant would answer
 * differently on every second call.
 */
const FIELD_ESCAPES = /[\\\t\n\r]/g;

/**
 * One separator character, as the escape that stands for it.
 *
 * The four branches are disjoint — each is one character — so the
 * order they are tested in decides nothing, which is measured
 * rather than assumed. The final return is the carriage return
 * rather than a default, and that is safe only because
 * {@link FIELD_ESCAPES} matches exactly these four. A case drives
 * all four so the pairing is measured too.
 *
 * @param character - One character the pattern matched.
 * @returns Its two-character escape.
 */
function escapeSeparator(character: string): string {
  if (character === '\\') {
    return '\\\\';
  }

  if (character === '\t') {
    return '\\t';
  }

  if (character === '\n') {
    return '\\n';
  }

  return '\\r';
}

/**
 * One field, with nothing left in it that a separator could be
 * mistaken for.
 *
 * One pass over the original, so an escape this introduces is never
 * read back and escaped again. That is what the whole rendering
 * leans on, and it is a property of `replace` rather than of the
 * order the four characters are handled in.
 *
 * @param value - The field text.
 * @returns The escaped form.
 */
function escapeField(value: string): string {
  return value.replace(FIELD_ESCAPES, escapeSeparator);
}

/**
 * One term, as the line it digests to.
 *
 * Category first, so the sort groups the set by category and a diff
 * of two canonical texts reads as the categories that moved. That
 * is the order `tests/lib/features.test.ts` already renders a term
 * set in, and keeping it means a reader meeting both texts is
 * meeting one convention.
 *
 * The weight is not escaped, because a rendered finite number holds
 * no separator and no backslash. It goes through the same join and
 * nothing else.
 *
 * @param term - The row, as the caller projected it.
 * @param index - Where it sat in the list as given.
 * @returns The line, with every field escaped.
 * @throws {Error} When any of the four members cannot be read.
 */
function canonicalLine(term: FeatureVersionTerm, index: number): string {
  if (term === null || typeof term !== 'object') {
    throw new Error(refusedTerm(index, TERM_FAULTS.notAnObject));
  }

  return [
    readText(term.category, index, TERM_FAULTS.category),
    readText(term.pattern, index, TERM_FAULTS.pattern),
    readWeight(term.weight, index),
    readText(term.polarity, index, TERM_FAULTS.polarity),
  ].join('\t');
}

/**
 * One text member, escaped, or a refusal naming it.
 *
 * The declared type says `string` and this does not trust it: a row
 * crosses a JSON boundary on its way into a Code node, and a type
 * is a claim about the column rather than a guarantee about the
 * value that arrived.
 *
 * @param value - Whatever the row carried in that column.
 * @param index - Where the term sat in the list as given.
 * @param fault - The predicate a refusal names, from
 * {@link TERM_FAULTS}.
 * @returns The escaped field.
 * @throws {Error} When the value is not a string.
 */
function readText(value: string, index: number, fault: string): string {
  if (typeof value !== 'string') {
    throw new Error(refusedTerm(index, fault));
  }

  return escapeField(value);
}

/**
 * The weight, rendered by value.
 *
 * Finite is the whole requirement, not integer: the column is an
 * `integer` today and a weight that arrived as one is rendered
 * exactly, while a fractional one is rendered by the shortest
 * representation that reads back as itself. `NaN` and the two
 * infinities are refused rather than rendered, because each of them
 * is a weight nobody authored and all three would digest as stable
 * text.
 *
 * A number arriving as TEXT is refused here rather than parsed. The
 * gate would parse it, but a version has to distinguish the term
 * sets a caller can actually store, and a `terms` row projected
 * through a driver that stringifies numbers is a projection fault
 * worth a throw rather than a silently different fingerprint.
 *
 * @param value - Whatever the row carried in that column.
 * @param index - Where the term sat in the list as given.
 * @returns The rendered weight.
 * @throws {Error} When the value is not a finite number.
 */
function readWeight(value: number, index: number): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(refusedTerm(index, TERM_FAULTS.weight));
  }

  return String(value);
}

/**
 * A domain's term set as one text: one term per line, sorted, every
 * field escaped.
 *
 * Exported because the digest is a number and a number cannot say
 * what moved. Two runs disagreeing about a version are diagnosed by
 * diffing the two texts, which is also what makes a case able to
 * pin WHAT was digested rather than only that a number changed.
 *
 * The sort is over the escaped lines, so it orders exactly the
 * bytes that are digested, and it is the default sort — UTF-16 code
 * units, the same everywhere. The array sorted is the one `map`
 * just built, so the caller's list is left as it was found.
 *
 * @param terms - The domain's terms, in any order.
 * @returns The canonical text, empty for an empty set.
 * @throws {Error} When the set is not an array, or when any term
 * cannot be read.
 */
export function termSetCanonicalText(
  terms: readonly FeatureVersionTerm[],
): string {
  if (!Array.isArray(terms)) {
    throw new Error(
      '[feature-version] the term set is not an array. A version ' +
      'composed over a term set this module could not read pins ' +
      'nothing, and it is written into documents.feature_version, ' +
      'where every later pass reads it as a vector that is current.',
    );
  }

  const lines = terms.map(
    (term: FeatureVersionTerm, index: number) => canonicalLine(term, index),
  );

  return lines.sort().join('\n');
}

// ---------------------------------------------------------------------------
// The digest
// ---------------------------------------------------------------------------

/**
 * The FNV-1a 64-bit offset basis.
 *
 * Built from a decimal string rather than written as a `BigInt`
 * literal, the way `shingle.ts` builds its own copy: the string
 * form is the one a reader can check against the published
 * constant.
 */
const FNV_OFFSET_BASIS = BigInt('14695981039346656037');

/** The FNV-1a 64-bit prime, by the same route. */
const FNV_PRIME = BigInt('1099511628211');

/**
 * What keeps the running hash inside 64 bits.
 *
 * `BigInt` multiplication is unbounded and FNV-1a is not, so
 * without this the value grows without limit and stops being the
 * function it is named after after the first character.
 */
const FNV_MASK_64 = (BigInt(1) << BigInt(64)) - BigInt(1);

/**
 * {@link TERM_DIGEST_SPAN} as the type the fold is done in.
 *
 * Hoisted rather than built per call, which moves nothing: a
 * `BigInt` is immutable, so one value built once is the value built
 * every time.
 */
const TERM_DIGEST_MODULUS = BigInt(TERM_DIGEST_SPAN);

/**
 * FNV-1a over one text, at 64 bits.
 *
 * Over UTF-16 code units rather than encoded bytes, which is a
 * choice and not an accident: it needs no encoder, it is exactly
 * what `shingle.ts` does beside it, and it is deterministic for
 * every string a term set can hold — a surrogate pair contributes
 * its two units, always the same two. The consequence is that this
 * agrees with no other implementation of FNV-1a over the same text,
 * and nothing asks it to.
 *
 * @param text - The canonical form of a term set.
 * @returns The 64-bit hash.
 */
function fnv1a64(text: string): bigint {
  let hash = FNV_OFFSET_BASIS;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= BigInt(text.charCodeAt(index));
    hash = (hash * FNV_PRIME) & FNV_MASK_64;
  }

  return hash;
}

/**
 * A domain's term set as one number under
 * {@link TERM_DIGEST_SPAN}.
 *
 * The domain's half of the pin, on its own. Exported beside
 * {@link featureVersionFor} because the two halves fail
 * differently: a version that moved is either a mechanism bump
 * somebody made or a taxonomy edit somebody made, and only this
 * function separates them.
 *
 * The fold is a modulo by a power of two, which is the hash's low
 * bits — where FNV-1a mixes. It is a fingerprint and not a proof;
 * the header says what that admits.
 *
 * @param terms - The domain's terms, in any order.
 * @returns A number from `0` to `TERM_DIGEST_SPAN - 1`.
 * @throws {Error} When the set is not an array, or when any term
 * cannot be read.
 */
export function termSetDigest(terms: readonly FeatureVersionTerm[]): number {
  const hash = fnv1a64(termSetCanonicalText(terms));

  return Number(hash % TERM_DIGEST_MODULUS);
}

// ---------------------------------------------------------------------------
// The composition
// ---------------------------------------------------------------------------

/**
 * The one integer `documents.feature_version` stores.
 *
 * Both inputs, composed rather than hashed together, so the
 * mechanism version stays readable out of a stored value and a
 * deliberate bump can never be lost to a collision. The header
 * carries the argument; what is worth reading here is that BOTH
 * arguments are required and neither has a default. A caller that
 * knows only one of them knows nothing this column can record.
 *
 * `FEATURE_MECHANISM_VERSION` from `features.ts` is what the first
 * argument is for. It is passed rather than imported because a
 * spliced library imports nothing, so a Code node computing a
 * vector carries both markers and joins them in its own body.
 *
 * The same call writes both columns. `domains.feature_version` is
 * this function over the domain's current terms;
 * `documents.feature_version` is this function over the terms the
 * document was actually read against — which is the same call in
 * the same pass, and a stored vector is stale exactly when a later
 * pass computes a different number.
 *
 * @param mechanismVersion - `FEATURE_MECHANISM_VERSION`, as
 * `features.ts` declares it.
 * @param terms - The domain's terms, in any order.
 * @returns A version from `TERM_DIGEST_SPAN` to
 * {@link MAX_FEATURE_VERSION}, never `0` and never negative.
 * @throws {Error} When the mechanism version is not an integer in
 * `1 .. MAX_FEATURE_MECHANISM_VERSION`, when the term set is not an
 * array, or when any term cannot be read.
 */
export function featureVersionFor(
  mechanismVersion: number,
  terms: readonly FeatureVersionTerm[],
): number {
  if (
    typeof mechanismVersion !== 'number'
    || !Number.isInteger(mechanismVersion)
    || mechanismVersion < 1
    || mechanismVersion > MAX_FEATURE_MECHANISM_VERSION
  ) {
    throw new Error(refusedMechanism(mechanismVersion));
  }

  return mechanismVersion * TERM_DIGEST_SPAN + termSetDigest(terms);
}
