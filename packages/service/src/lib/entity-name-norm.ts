/**
 * @packageDocumentation
 * entity-name-norm — the single definition of what
 * `entities.name_norm` holds.
 *
 * The registry stores a subject's name twice: `name` as a person
 * reads it, and `name_norm` as the registry matches on. The second
 * is the key half of `entities_domain_id_name_norm_unique`, so it is
 * what an upsert resolves a subject through and what makes one
 * subject arriving spelled three ways land on one row.
 *
 * The column's own TSDoc in `src/db/schema/entities.ts` is what this
 * file answers, and the sharp half of its argument is the failure
 * mode rather than the rule: no schema computes the value, so every
 * writer that stores or looks up an entity reduces the name itself —
 * and a writer that reduces it differently NEVER FAILS. Its lookup
 * finds nothing, its insert lands a rival row beside the one it
 * meant to find, and the registry goes on looking correct from the
 * inside. That is why the column asks for a single definition rather
 * than for a convention. A caller reduces a name by calling
 * {@link normalizeEntityName} or it does not reduce one at all;
 * there is no third option that is not a second definition.
 *
 * ## The reduction, in the order it runs
 *
 * 1. THE CASE FOLD, with `toLowerCase` and never
 *    `toLocaleLowerCase`. The locale-aware form is a per-deployment
 *    difference in the key — a Turkish locale lowercases a capital
 *    I to a dotless one — and a key that depends on where the
 *    process runs is exactly the silent miss the column warns about,
 *    arriving as a rival row on one host and not on another.
 * 2. THE NORMALIZATION, after the fold rather than before. Case
 *    conversion can leave a string that is in no normal form
 *    (measured: a capital dotted I lowercases to a letter followed
 *    by a combining dot above), so normalizing last is what makes
 *    the form of the answer a guarantee instead of an observation.
 *    Compatibility composition rather than canonical: NFC folds only
 *    spellings made of the same characters, where NFKC also folds a
 *    fullwidth letter onto its ASCII one, an fi ligature onto two
 *    letters and a no-break space onto a space. Those are
 *    differences whoever typed the name cannot see, which is the
 *    class that produces a rival row nobody can find the reason for.
 *    What NFKC loses is paid for by `name`, which keeps whatever the
 *    source wrote — that split is the whole reason the column is a
 *    pair.
 * 3. EVERY RUN OF WHAT DOES NOT IDENTIFY BECOMES ONE SPACE, and
 *    then the ends are trimmed. What identifies is a letter, a digit
 *    or a mark in any script; punctuation, symbols, whitespace and
 *    invisible format characters are separators whatever else they
 *    are. One pass over RUNS rather than a punctuation pass and a
 *    whitespace pass, which answered identically over every value
 *    measured and leaves no order between the two to get wrong.
 *
 * ## What the refusal is for
 *
 * The empty string is the one key that must never be stored, and the
 * column says why: a blank key collapses every subject a writer
 * could not name onto a single row per domain — one entity
 * accumulating the research, findings and judgements of all of them.
 * So a name carrying nothing that identifies a subject is refused
 * here rather than reduced to a key, and a writer with no name to
 * hand synthesizes something that distinguishes the subject instead.
 *
 * IT THROWS, which is the opposite of `validate-entity-name.ts`
 * beside it and deliberately so. That file gates text somebody
 * else's document produced, where a raise would be a denial of
 * service available to anybody who can place a document in front of
 * the pipeline. This one answers what the key IS for a name a caller
 * has already decided to store, so a name that reduces to nothing is
 * a fault in the caller rather than an outcome the pipeline carries.
 *
 * THE MESSAGE NAMES NO PART OF THE VALUE. A refusal here reaches an
 * HTTP surface — a name patch recomputes the key through this
 * function rather than accepting one — and the no-echo rule that
 * surface is held to forbids a submitted value coming back in a
 * message, in a detail or in a cause. Nothing is lost by leaving it
 * out: the reason is a property of the reduction and not of the
 * string it was handed.
 *
 * ## It splits rather than merges where it is unsure
 *
 * Every character the reduction does not recognize becomes a
 * separator, and one consequence of that is worth stating rather
 * than leaving to be discovered: AN INVISIBLE CHARACTER SPLITS A KEY
 * rather than vanishing from it. A zero-width space between two
 * letters answers two words where a reader sees one.
 *
 * That is the safe direction of the two and it is chosen rather than
 * settled for. A reduction erring the other way would fold a
 * distinction a script means — a zero-width non-joiner is the
 * difference between two words in more than one language — and a
 * wrong MERGE is one row holding two subjects' histories, which
 * nothing afterwards can take apart. A wrong SPLIT is two rows a
 * person can see, and `alias_of` on the same table is what settles
 * one. `validate-entity-name.ts` takes the same line for the same
 * reason: anything that strips invisible characters belongs upstream
 * of both of them.
 *
 * ## What this does not reach
 *
 * Two limits, named because each looks like a fault until the trade
 * behind it is read.
 *
 * A PERIOD INSIDE AN ACRONYM SEPARATES like any other punctuation,
 * so a name spelled with them reduces to as many words as it has
 * letters while the same name spelled without them reduces to one.
 * Folding those together means DROPPING separators rather than
 * collapsing them, which would also fold every two-word name onto
 * its own concatenation and match it against a different subject.
 * One of the two has to be given up, and this is the one.
 *
 * A CASE CONVERSION IS NOT A CASE FOLD in the Unicode sense, so a
 * few pairs a folding table calls equal come out as two keys here.
 * Measured: a capital dotted I reduces to a letter and a combining
 * dot where a plain capital I reduces to the letter alone. That is
 * the splitting direction again, and it is what `toLowerCase` does.
 *
 * ## Dual context
 *
 * Like every module under `src/lib/`, this one is imported by the
 * default suite AND spliced into a workflow Code node body by
 * `scripts/build-workflows.ts`. So it imports nothing, exports
 * declarations only, and keeps no state between calls: the one
 * pattern it declares is global but is read through
 * `String.prototype.replace`, which resets a pattern's cursor before
 * it starts, where `.test()` would advance it and leave a shared
 * instance answering differently on alternate calls.
 *
 * Its top-level names carry a prefix, which is the one dual-context
 * hazard a library cannot check for itself. A node splicing two
 * libraries puts both sets of top-level declarations into ONE scope,
 * and a duplicate `const` is a `SyntaxError` on that node's first
 * execution rather than a build that refused. The library most
 * likely to be spliced beside this one is `validate-entity-name.ts`
 * — a workflow that validates an extracted name and then keys it
 * needs both — and it already declares an `ENTITY_NAME_` prefixed
 * whitespace pattern, so nothing here reuses that prefix.
 *
 * `tests/build/lib-splice.test.ts` registers it and reads what a
 * real build made of it.
 */

// ---------------------------------------------------------------------------
// The reduction
// ---------------------------------------------------------------------------

/**
 * The normalization form the key is expressed in.
 *
 * Compatibility composition rather than canonical — the header says
 * what that folds and why the loss is affordable here.
 *
 * A named constant rather than a literal at the point of use,
 * because it is the one step of the reduction whose choice is
 * invisible in the code that runs it: every form is spelled the same
 * way at the call.
 */
const ENTITY_KEY_NORMAL_FORM = 'NFKC';

/**
 * A run of everything that does not identify a subject.
 *
 * Letters, digits and marks in any script are what a key is made of,
 * and every run of anything else is one separator. Matching RUNS is
 * what collapses the whitespace too, so there is no second pass and
 * no order between two of them to get wrong.
 *
 * Marks are in the keep set on purpose. A great many scripts spell a
 * word with them — a Devanagari vowel sign and an Arabic shadda are
 * neither letters nor digits — and a reduction dropping them would
 * key unrelated words alike, which is the wrong direction of the two
 * for the reason the header gives.
 *
 * Module-private, and global for the reason the header states rather
 * than for speed.
 */
const ENTITY_KEY_NON_IDENTIFYING = /[^\p{L}\p{N}\p{M}]+/gu;

/**
 * Reduce a name to the key `entities.name_norm` stores.
 *
 * The single definition the column asks for: fold the case,
 * normalize, turn every run of what does not identify into one
 * space, trim, and refuse what came out empty.
 *
 * Deterministic and idempotent. The answer depends on nothing but
 * the argument — no locale, no clock, no state this module keeps —
 * and reducing an answer again returns it unchanged, which is what
 * lets a stored key be compared against a freshly reduced one.
 *
 * Takes a `string` rather than `unknown`, which is the line between
 * this and `validate-entity-name.ts`. That file gates whatever an
 * extraction produced, a value that is not text included; this one
 * answers what the key IS for a name a caller has already decided to
 * store, so the type question belongs to whatever decided — a schema
 * at the HTTP boundary, that gate inside a workflow.
 *
 * @param name - The subject's name, as a person would read it.
 * @returns The key the registry matches on, never the empty string.
 * @throws {Error} When the name carries nothing that identifies a
 *   subject, so the key would be the empty string.
 */
export function normalizeEntityName(name: string): string {
  const folded = name.toLowerCase().normalize(ENTITY_KEY_NORMAL_FORM);
  const key = folded.replace(ENTITY_KEY_NON_IDENTIFYING, ' ').trim();

  if (key.length === 0) {
    throw new Error(
      '[entity-name-norm] a name has to carry something that '
      + 'identifies a subject, and this one reduced to nothing. The '
      + 'empty string is the one key that must never be stored: it '
      + 'collapses every subject a writer could not name onto a '
      + 'single row per domain, one entity accumulating the '
      + 'research, findings and judgements of all of them.',
    );
  }

  return key;
}
