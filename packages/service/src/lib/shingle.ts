/**
 * @packageDocumentation
 * shingle — a cheap body-similarity sketch, and the comparison that
 * reads two sketches as "the same document, ingested twice".
 *
 * The mechanism is four steps and no more. A body is normalized to
 * lowercase words, cut into overlapping runs of eight of them, each
 * run hashed, and the sixty-four smallest hashes kept as the sketch.
 * Two sketches are then compared by how much they overlap, which
 * estimates how much of the two bodies was the same. No model, no
 * service, no network: this runs on the same terms as every other
 * deterministic scan here, which is what makes it usable on a body
 * the moment it arrives rather than after something has embedded it.
 *
 * Nothing in this file decides WHICH documents are compared, or what
 * happens to a pair that converges. It answers one question about two
 * sketches; the pass that builds them, stores them and acts on the
 * answer arrives with the ingest workflow in a later phase.
 *
 * Three numbers parameterize it, and each is a bound rather than a
 * preference:
 *
 * - Eight words per run. Short enough that a lightly-edited copy of a
 *   document still shares most of its runs with the original, long
 *   enough that two unrelated documents sharing one ordinary phrase
 *   do not.
 * - Sixty-four hashes in the sketch. A fixed size whatever the body's
 *   length, which is what makes a sketch storable in one array column
 *   and comparable in one expression.
 * - Eight tenths to converge. Two copies of one document differing
 *   only in a wrapper's header and footer sit well above it; two
 *   different documents from one source sit well below. The cases
 *   pin both sides with real margin rather than at the boundary.
 *
 * Each hash is kept at 63 bits, NOT 64, and that is a storage bound
 * rather than a hashing one: a sketch lands in a signed 64-bit
 * integer array, so a value above the signed maximum would arrive
 * back as a negative number or overflow the literal outright.
 * Dropping the top bit costs nothing that matters at these volumes —
 * the collision probability over a few hundred runs per body is still
 * negligible — and it makes the stored value the same number a
 * comparison in the database sees.
 *
 * The hash is FNV-1a, written out here over `BigInt` rather than
 * reached for from a hashing module, and that is the port's most
 * load-bearing shape rather than a stylistic choice. A copy of this
 * library is spliced into a workflow Code node by
 * `scripts/build-workflows.ts`, and a Code node is not a module: it
 * resolves no specifier at all, so there is nothing there for a
 * `node:crypto` — or any other import — to resolve ON. The
 * arithmetic is therefore done in a type the language already hands
 * every context, with the 64-bit and 63-bit masks applied explicitly
 * because `BigInt` is unbounded and FNV-1a is not. Anyone reading
 * this and reaching for a one-line digest call should read
 * `assertSpliceable` in `scripts/workflow-markers.ts` first: the
 * build refuses the import, so the reach fails as a build error
 * rather than as a wrong answer.
 *
 * Three shapes together are what stop this from guessing, and they
 * are easy to read as tidiness rather than as the bound they are.
 *
 * A body with fewer than eight words cannot be cut into a single run,
 * so it gets an EMPTY sketch — which {@link sketchSimilarity} reads
 * as "no opinion", not as "identical to every other short body".
 *
 * {@link sketchComparable} then insists that BOTH sketches be full
 * before a similarity is worth acting on, and that is a correctness
 * bound. Similarity divides by the SMALLER of the two sketch sizes,
 * so a partial sketch inflates without limit: a stub producing four
 * runs, all four of which legitimately appear inside a long document
 * from the same source, reads as a perfect match. Requiring
 * sixty-four on each side means this only ever speaks about bodies
 * long enough to produce sixty-four distinct runs — roughly seventy
 * words up. Everything shorter is left to the exact dedupe layers,
 * which do not guess.
 *
 * {@link bodySketch} never throws. A sketch is an optimization, and a
 * body that defeats it must cost that one document its inexact-dedupe
 * chance rather than the run. The comparison functions are the other
 * way round and deliberately so: they can still throw, because a
 * value that refuses to become text is a caller's mistake about what
 * a sketch IS, and there is no useful answer to hand back for it.
 *
 * The two lookup tables here are null-prototype objects, which the
 * original already reached for and which is load-bearing rather than
 * hygienic. Sketch entries are strings a caller supplies, so one of
 * them can be `__proto__` — and written into a plain object literal
 * that key never becomes an own property, while reading it back
 * answers the prototype and is TRUTHY. Every sketch carrying that one
 * string would then overlap every other. `Object.create(null)` makes
 * the write a real key and the read a real answer, and a case pins
 * it.
 *
 * This library is dual-context, like every module under `src/lib/`:
 * the default suite imports it, and the build splices its transpiled
 * text into a Code node body. So it imports nothing, {@link asText}
 * is written out here rather than shared with the identical guard in
 * `parse-csv.ts` and `sanitize-md.ts` — a second module would need
 * the import the splice rule forbids, which is also why this file is
 * not split — and it keeps no state between calls.
 * `tests/build/lib-splice.test.ts` registers it and reads what a real
 * build made of it.
 *
 * This is a PORT, and what it KEEPS is the whole of the behaviour:
 * the three parameters, the normalization's character classes, the
 * run length and the overlap step, the FNV-1a constants and both
 * masks, the decimal-string representation and the sort that orders
 * it, the deduplication of runs before the cut to sixty-four, the
 * division by the smaller sketch, the comparability gate, and the
 * threshold fallback in front of convergence.
 * `tests/parity/shingle.parity.test.ts` is what says so rather than
 * this paragraph — it drives every export against its original over
 * one neutral corpus and fails on the first difference.
 *
 * What it DROPS is four things, none of them behaviour. The CommonJS
 * export block at the foot of the original becomes declaration
 * exports, which is what the splice strips and what a Code node can
 * run. `var` becomes `const` and `let`. The caught error in
 * {@link bodySketch} loses its unused binding, because an unused
 * binding is a lint error here and an optional catch is the same
 * statement without one. And the hash's four constants are hoisted to
 * module scope from inside the function that used them, which moves
 * nothing: a `BigInt` is immutable, so four values built once are the
 * four values built per call.
 *
 * The fifth thing it leaves behind is subject matter rather than
 * code. The original was pointed at one particular kind of document,
 * in one particular language, arriving from one particular kind of
 * source, and its comments argued the parameters in those terms.
 * Every argument above survives that removal intact, because none of
 * it was ever about the subject: word-run overlap is a property of
 * prose. The one clause worth restating in neutral form is why
 * letters and digits are kept by Unicode property rather than by an
 * ASCII range — a domain whose documents are not written in English
 * would otherwise be shredded into fragments matching nothing, which
 * would not fail, it would silently stop deduplicating.
 *
 * Two behaviours are preserved DELIBERATELY and are worth finding
 * here rather than in a debugger.
 *
 * The threshold argument applies only when it IS a finite number.
 * Anything else — a numeric string out of configuration, an absent
 * argument, a value that is not finite — falls back to
 * {@link SHINGLE_THRESHOLD} silently. A caller passing a threshold as
 * text therefore gets the default rather than an error, which is the
 * original's reading and is pinned by a case.
 *
 * And {@link sketchSimilarity} compares entries after a string
 * conversion rather than by identity, which is what lets a sketch
 * come back out of storage as whatever a driver made of it. The
 * conversion is a plain `String(entry)` and nothing cleverer, so two
 * entries match only where they PRINT as the same text — and a
 * 63-bit hash does not survive being a JavaScript number. It sits
 * past the safe integer range, so the double rounds and prints a
 * different decimal: measured over one full sketch, two of its
 * sixty-four entries came back as themselves and the pair read as
 * three per cent similar. That is the whole reason
 * {@link bodySketch} answers decimal strings, and it means a caller
 * that lets a sketch through anything parsing JSON numbers has
 * already lost it. Both readings are pinned by a case.
 */

/** How many words one run of the body covers. */
export const SHINGLE_WORDS = 8;

/**
 * How many hashes a full sketch holds.
 *
 * Also the comparability floor: {@link sketchComparable} requires
 * this many on BOTH sides, for the reason the module header gives.
 */
export const SHINGLE_SKETCH_SIZE = 64;

/**
 * The convergence threshold, when a caller names none.
 *
 * One number in one place on purpose. The preview, the write and any
 * comparison expressed in the database all read the same definition
 * of "similar", so they cannot disagree about which pairs converge.
 */
export const SHINGLE_THRESHOLD = 0.8;

/**
 * The FNV-1a 64-bit offset basis.
 *
 * Written from a decimal string, as the original does, rather than as
 * a `BigInt` literal: the string form is the one a reader can check
 * against the published constant character for character.
 */
const FNV_OFFSET_BASIS = BigInt('14695981039346656037');

/** The FNV-1a 64-bit prime, by the same route. */
const FNV_PRIME = BigInt('1099511628211');

/**
 * The mask that keeps the running hash inside 64 bits.
 *
 * `BigInt` multiplication is unbounded, so without this the hash
 * grows without limit and stops being FNV-1a after the first word.
 */
const FNV_MASK_64 = (BigInt(1) << BigInt(64)) - BigInt(1);

/**
 * The mask that drops the top bit on the way out.
 *
 * The storage bound, not the hashing one — see the module header.
 */
const FNV_MASK_63 = (BigInt(1) << BigInt(63)) - BigInt(1);

/**
 * Every run of characters that is not a letter or a digit.
 *
 * Unicode property escapes rather than an ASCII range, which is the
 * clause the module header calls out: punctuation, markup, bullet
 * glyphs and the invisible characters an intake pass strips all
 * become a space here, while a letter in any script is a letter. Two
 * copies of one document that differ only in their list markers
 * therefore produce identical runs.
 */
const SHINGLE_DROPPED_RUN = /[^\p{L}\p{N}]+/gu;

/** Every run of whitespace, collapsed to one space. */
const SHINGLE_SPACE_RUN = /\s+/g;

/**
 * Whatever a caller passed, as text.
 *
 * Takes `unknown` on purpose. The spliced copy runs in a Code node
 * where no type was ever checked, so this guard is all that stands
 * between a node handing this an absent field and a crash inside a
 * string method — and typing the parameter as `string` would let the
 * compiler delete the reasoning while the runtime still needed it.
 *
 * Absence answers the empty string, and everything else answers its
 * own string conversion. That includes values whose conversion
 * THROWS: an object carrying a hostile `toString` refuses here, which
 * {@link bodySketch} turns into an empty sketch and the comparison
 * functions let through.
 *
 * @param value - Anything at all, including nothing.
 * @returns The text to shingle.
 */
function asText(value: unknown): string {
  return value === null || value === undefined
    ? ''
    : String(value);
}

/**
 * Reduce a body to lowercase words separated by single spaces.
 *
 * The only normalization there is, and everything downstream reads
 * its output rather than the body: two documents that differ in case,
 * punctuation or layout and in nothing else normalize identically,
 * which is the whole reason a lightly-reformatted copy is still
 * recognisable.
 *
 * Exported because the sketch is not always the useful artifact — a
 * caller comparing two short bodies, or explaining why two long ones
 * did not converge, wants the words this saw.
 *
 * @param text - The body. Anything that is not a string is read
 * through {@link asText} first.
 * @returns The words, lowercased, single-spaced and trimmed.
 */
export function shingleNormalize(text: string): string {
  return asText(text)
    .toLowerCase()
    .replace(SHINGLE_DROPPED_RUN, ' ')
    .replace(SHINGLE_SPACE_RUN, ' ')
    .trim();
}

/**
 * The normalized body as a word list.
 *
 * Split on the single space {@link shingleNormalize} guarantees, with
 * the empty body answering an empty list rather than a list holding
 * one empty word — which is the difference between a body of no words
 * and a body of one, and would put a run of eight empty strings into
 * the sketch of any document that normalized to nothing.
 *
 * Not exported, which is the original's surface and is kept: the
 * parity suite drives what the original exports, so widening the
 * surface here would add behaviour nothing compares.
 *
 * @param text - The body, in any shape {@link asText} accepts.
 * @returns The words, in order, possibly none.
 */
function shingleTokens(text: string): string[] {
  const normalized = shingleNormalize(text);

  return normalized === ''
    ? []
    : normalized.split(' ');
}

/**
 * FNV-1a over one run, masked to 63 bits.
 *
 * The construction is the published one — offset basis, then per byte
 * an exclusive-or followed by a multiply, folded back into 64 bits —
 * with the top bit dropped on the way out for the storage reason the
 * module header gives. It is written over `BigInt` because a spliced
 * copy has nothing to resolve a hashing module ON; that paragraph is
 * the one to read before replacing this with a digest call.
 *
 * Iterates by UTF-16 code unit rather than by code point, which is
 * what `charCodeAt` does and is the original's reading. A character
 * outside the basic plane therefore contributes its two surrogates
 * separately. That is a property of the hash and not a fault in it:
 * both sides of any comparison hash the same way, so the only thing
 * it costs is that this hash cannot be compared against one computed
 * by some other implementation of FNV-1a over code points.
 *
 * @param str - One run of words, already normalized and joined.
 * @returns The hash, in the range zero to two-to-the-63 minus one.
 */
export function shingleHash(str: string): bigint {
  let hash = FNV_OFFSET_BASIS;

  for (let i = 0; i < str.length; i += 1) {
    hash ^= BigInt(str.charCodeAt(i));
    hash = (hash * FNV_PRIME) & FNV_MASK_64;
  }

  return hash & FNV_MASK_63;
}

/**
 * Order two hashes written as decimal strings, numerically.
 *
 * Comparing by length first and lexicographically second IS a numeric
 * sort for non-negative decimals carrying no leading zeros, which is
 * exactly what these are: a longer decimal is a larger number, and
 * two of the same length order the same way as text and as numbers.
 * The sketch is the sixty-four SMALLEST hashes, so this ordering is
 * what decides which runs a long body keeps.
 *
 * @param a - One hash, as a decimal string.
 * @param b - The other.
 * @returns Negative, zero or positive, as a sort comparator wants.
 */
function shingleCompare(a: string, b: string): number {
  if (a.length !== b.length) {
    return a.length - b.length;
  }

  if (a < b) {
    return -1;
  }

  return a > b
    ? 1
    : 0;
}

/**
 * Sketch a body: up to sixty-four hashes, ascending, as decimal
 * strings.
 *
 * Decimal strings rather than `BigInt` values, and that is about the
 * journey rather than the arithmetic: a sketch is JSON-encoded on its
 * way to storage and `BigInt` has no JSON representation at all —
 * serializing one throws. Strings are the representation that
 * survives that journey intact, and they are the only one that does:
 * a hash this size is past what a JavaScript number holds, so a
 * sketch parsed into numbers has already been rounded and stops
 * matching. The module header carries the measurement.
 *
 * Runs are deduplicated before the cut, so a body repeating one
 * phrase contributes that phrase's hash once. The cut then keeps the
 * sixty-four smallest, which is what makes two sketches comparable at
 * all: the same hash function over the same runs selects the same
 * region of the hash space in both bodies, so overlap in the sketches
 * estimates overlap in the bodies.
 *
 * A body of fewer than eight words gets an empty sketch, for the
 * reason the module header gives.
 *
 * Never throws. Every ending — an unusable body, a value that refuses
 * to become text, anything the loop could raise — comes back as an
 * empty sketch, because a sketch is an optimization and one document
 * defeating it must not cost the run.
 *
 * @param text - The body. Anything that is not a string is read
 * through {@link asText} first.
 * @returns Up to {@link SHINGLE_SKETCH_SIZE} hashes, ascending, as
 * decimal strings. Empty means no opinion.
 */
export function bodySketch(text: string): string[] {
  try {
    const words = shingleTokens(text);

    if (words.length < SHINGLE_WORDS) {
      return [];
    }

    const seen: Record<string, boolean> = Object.create(null);
    const hashes: string[] = [];

    for (let i = 0; i + SHINGLE_WORDS <= words.length; i += 1) {
      const run = words.slice(i, i + SHINGLE_WORDS).join(' ');
      const hash = shingleHash(run).toString();

      if (seen[hash]) {
        continue;
      }

      seen[hash] = true;
      hashes.push(hash);
    }

    hashes.sort(shingleCompare);

    return hashes.slice(0, SHINGLE_SKETCH_SIZE);
  } catch {
    return [];
  }
}

/**
 * Whatever a caller passed, as a sketch.
 *
 * Anything that is not a list answers an empty sketch, which the
 * comparisons read as no opinion — so a column that was never
 * written, or a JSON field that arrived as null, is a document this
 * cannot speak about rather than an error.
 *
 * Absent entries are DROPPED rather than converted, which is the one
 * place this differs from {@link asText}'s reading of absence: a hole
 * in a stored array is a hole, and turning it into the empty string
 * would put a value in the sketch that no run ever hashed to and that
 * two sketches could then agree on.
 *
 * Everything else is converted, which is what lets a sketch arrive
 * as whatever a storage driver made of it. The conversion is a plain
 * `String(entry)`, so it rescues only values that print as the text
 * they were stored as — not a hash something has already parsed
 * into a number. It can also throw for a value that refuses it, and
 * the comparisons let that through deliberately: both readings are
 * in the module header.
 *
 * @param value - Anything at all, including nothing.
 * @returns The sketch entries, as text, in the order they arrived.
 */
function shingleSketchArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const out: string[] = [];

  for (const entry of value) {
    if (entry === null || entry === undefined) {
      continue;
    }

    out.push(String(entry));
  }

  return out;
}

/**
 * How much two sketches overlap, from zero to one.
 *
 * Overlap divided by the SMALLER of the two sketch sizes — which for
 * the two full sketches {@link sketchComparable} insists on is
 * overlap over sixty-four, the number the threshold is expressed in.
 * The smaller-of-the-two divisor is only ever reached by a caller
 * that asked for a raw number without the comparability gate, and the
 * module header says what such a number is worth.
 *
 * Two empty sketches answer zero rather than one. That is the "no
 * opinion" reading again and it is the important one: a similarity of
 * one for two bodies nothing could be computed about would converge
 * every short document with every other.
 *
 * Duplicate entries in either sketch are counted as they arrive on
 * the right-hand side, so a sketch a caller built by hand with
 * repeats can read above one. {@link bodySketch} never produces one,
 * and the case that pins this is a record rather than an endorsement.
 *
 * @param a - One sketch. Anything that is not a list is no opinion.
 * @param b - The other, read the same way.
 * @returns The overlap estimate, normally between zero and one.
 * @throws When an entry in either sketch refuses to become text.
 */
export function sketchSimilarity(
  a: readonly string[],
  b: readonly string[],
): number {
  const left = shingleSketchArray(a);
  const right = shingleSketchArray(b);
  const smaller = Math.min(left.length, right.length);

  if (smaller === 0) {
    return 0;
  }

  // Null-prototype, so an entry reading `__proto__` is a key rather
  // than a silent write and a truthy read. See the module header.
  const set: Record<string, boolean> = Object.create(null);

  for (const entry of left) {
    set[entry] = true;
  }

  let overlap = 0;

  for (const entry of right) {
    if (set[entry]) {
      overlap += 1;
    }
  }

  return overlap / smaller;
}

/**
 * Whether two sketches are big enough to judge from.
 *
 * Both must be full. That is a correctness bound rather than
 * tidiness, and the module header carries the arithmetic: a partial
 * sketch divided by the smaller size inflates without limit, so a
 * short body reads as a perfect match for any long one that contains
 * it.
 *
 * A caller that skips this and acts on {@link sketchSimilarity}
 * directly is not making a stricter judgement or a looser one — it is
 * making one this file does not stand behind.
 *
 * @param a - One sketch. Anything that is not a list is not full.
 * @param b - The other, read the same way.
 * @returns Whether both hold {@link SHINGLE_SKETCH_SIZE} entries.
 * @throws When an entry in either sketch refuses to become text.
 */
export function sketchComparable(
  a: readonly string[],
  b: readonly string[],
): boolean {
  return shingleSketchArray(a).length >= SHINGLE_SKETCH_SIZE
    && shingleSketchArray(b).length >= SHINGLE_SKETCH_SIZE;
}

/**
 * Whether two sketches mean the same document arrived twice.
 *
 * The comparability gate first, then the threshold: an unjudgeable
 * pair answers false, which is the safe ending in both directions —
 * nothing is merged, and the exact dedupe layers still get their say.
 *
 * The threshold applies only when it IS a finite number. A numeric
 * string, an absent argument or a value outside the finite range all
 * fall back to {@link SHINGLE_THRESHOLD} silently, which matters
 * because a threshold read out of configuration arrives as text. That
 * is the original's reading, kept: a caller's mistake about the type
 * shows up as the default being used rather than as an error, and a
 * case pins it so nobody meets it by surprise.
 *
 * The finiteness check is the global one the original wrote rather
 * than `Number.isFinite`. The `typeof` test in front of it makes the
 * two provably identical here — the coercing form only differs for a
 * value that is not already a number — so this is left as written
 * rather than modernized into a difference nobody could see.
 *
 * @param a - One sketch.
 * @param b - The other.
 * @param threshold - How much overlap converges. Anything that is not
 * a finite number means {@link SHINGLE_THRESHOLD}.
 * @returns Whether the two bodies are the same document.
 * @throws When an entry in either sketch refuses to become text.
 */
export function sketchesConverge(
  a: readonly string[],
  b: readonly string[],
  threshold?: number,
): boolean {
  if (!sketchComparable(a, b)) {
    return false;
  }

  const limit = typeof threshold === 'number' && isFinite(threshold)
    ? threshold
    : SHINGLE_THRESHOLD;

  return sketchSimilarity(a, b) >= limit;
}
