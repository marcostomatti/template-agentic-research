/**
 * @packageDocumentation
 * digest-assemble — what one period came to, as structure: the
 * findings a pass selected put in one order, filed under the
 * domain's own sections, counted section by section, and carrying
 * the failures of the run that closed before this one.
 *
 * ## Why the structure is assembled here and the prose is not
 *
 * A digest has two halves and only one of them is a function of the
 * rows. THE STRUCTURED HALF is which findings were selected, what
 * order they go in, which section each belongs to, how many each
 * section holds, and what the pass before this one could not do.
 * Every one of those is decidable from the findings and the
 * domain's taxonomy, so it is decided here — once, by a pure
 * function with no clock, no query and no model call anywhere in
 * it. THE PROSE HALF is a paragraph a person reads, and it is a
 * model call: the caller prepares a chunk, makes the call, and
 * stores what came back.
 *
 * The two halves land in two columns of one row. `briefings.body`
 * in `src/db/schema/runs.ts` holds the prose and is nullable
 * because a pass whose drafting step answered nothing still has a
 * digest; `briefings.payload` beside it holds what this module
 * answers and is NOT NULL, because the structure exists whenever
 * the selection ran. That asymmetry is the whole argument for
 * assembling here rather than inside the drafting step: a digest
 * whose model call failed keeps its ordering, its sections and its
 * banner, and the pass has something to store and something to
 * show.
 *
 * The second reason is that the structure has more than one reader.
 * `briefings.payload`'s own column comment says a renderer handed
 * prose can only reproduce it, where one handed the counts and the
 * ids a period selected can lay them out per format. So the same
 * assembly answers the workflow that stores the row AND, through
 * the stored payload, every renderer under `src/exports/` — which
 * is what keeps four formats from disagreeing about what a period
 * came to.
 *
 * Nothing here decides what a model is ASKED. The prepared chunk is
 * `chunk.ts` and its framing is `prompt-frame.ts`, and both are
 * spliced beside this one in a canvas rather than reached from it.
 *
 * ## Null is not zero, in the two places a digest can get it wrong
 *
 * THE ORDERING. A finding whose `score` is NULL has not been
 * scored — `findings.score` is nullable with no default for exactly
 * that reading — and an unscored finding sorted as though it had
 * scored zero takes its place at the bottom of the digest as if it
 * had been read and found worthless. So an absent score sorts LAST
 * rather than lowest, which is a different statement: it is not
 * ranked against the scored findings at all, it is the tail behind
 * them.
 *
 * THE COUNTS. A section that was read and held nothing is `0`, and
 * a section nothing was read for is `null`. The two are different
 * facts about a period and a renderer shows them differently: `0`
 * says the domain looked and this bucket was empty, `null` says
 * nobody looked. A `0` written for an unread section is the same
 * fault as an unscored finding written as zero one level up — a
 * measurement claim about something nothing measured — and it is
 * quieter, because a zero in a count column reads as wrong nowhere.
 *
 * WHICH SECTIONS WERE READ IS THE CALLER'S TO SAY, in
 * {@link DigestInput.sectionsRead}, and there is no default that
 * would be safe: a pass reading everything and a pass reading one
 * category hand this module the same findings when the other
 * categories were empty. So the member is optional and omitting it
 * claims NOTHING was read, which under-claims rather than
 * over-claims — the direction a wrong answer should fail in.
 *
 * The one thing that overrides the claim is a finding. A section
 * holding findings is counted whatever the coverage list says,
 * because the findings are evidence and the list is an assertion:
 * a caller that forgot to name a section it plainly read gets the
 * number rather than a `null` contradicted by the rows underneath
 * it.
 *
 * ## What a section is, and what a domain gets to call one
 *
 * SECTIONS ARE THE DOMAIN'S CATEGORY KEYS, in the order the caller
 * declares them, plus ONE section for the findings under none. That
 * last section is not declared by anybody and is always present:
 * it is where a finding with no category key lands, and also where
 * a finding naming a key this domain does not declare lands. Those
 * two are not the same fault and they share a section anyway,
 * because the alternative is dropping a finding for having been
 * filed badly — and a digest that quietly loses a scored finding is
 * worse than one showing it under a heading that does not name it.
 *
 * `findings` carries no category column. A domain files a finding
 * under one of its categories through the `fields` payload its own
 * `DomainSettings.fieldContract` governs, so the key arrives here
 * as a member of the finding the caller handed over, projected by
 * whatever selected it. Nothing in this module reads a payload,
 * knows the field name, or has an opinion about where a domain
 * keeps the association.
 *
 * THE HEADING VOCABULARY comes from `DomainSettings` and stops at
 * one word. `findingsDisplayName` is the single alias a domain is
 * given — see `docs/architecture/00-overview.md` for why it is one
 * and why it reaches rendering and nothing else — and
 * {@link NEUTRAL_FINDINGS_DISPLAY_NAME} is what a domain that names
 * none is headed with. A declared category is headed by its own
 * label when it has one and by its key when it does not, since a
 * key is free text an operator chose and is the honest fallback.
 *
 * Nothing here cases a word, pluralizes one, or composes a phrase.
 * The neutral constant is written the way a heading wants it and a
 * domain setting is carried through verbatim, so a domain that
 * wrote its alias in the wrong case sees its own text rather than
 * this module's guess at it. Reducing that text is
 * `sanitize-md.ts`, which a canvas splices beside this one.
 *
 * ## The previous run's errors are carried, never dropped
 *
 * `runs.errors` says so from the schema's side: failures are kept
 * there rather than only in a log because this is what the next
 * pass reads, and an export rendering them puts a source that
 * quietly stopped working in front of an operator who was going to
 * read the digest anyway. So they arrive here and leave here, as
 * {@link DigestBanner}.
 *
 * The column is unannotated jsonb — its entries share no shape, so
 * one interface across them would describe none of them — and it is
 * NOT NULL only by default rather than by anything reaching inside
 * it. A value that is not a list is therefore storable, and it is
 * carried as the banner's single entry rather than discarded:
 * whatever wrote a non-list into the errors column is itself a
 * fault, and dropping it would make the pass that hit it look
 * clean.
 *
 * Entries are carried as they arrived. Nothing here reads one,
 * shortens one or renders one, for the reason nothing here reads a
 * `fields` payload.
 *
 * ## Dual context
 *
 * Like every module under `src/lib/`, this one is imported by the
 * default suite AND spliced into a workflow Code node body by
 * `scripts/build-workflows.ts`. So it imports nothing — not even
 * the `DomainSettings` interface it reads one member of, which is
 * named in prose above and declared structurally below — keeps no
 * state between calls, reaches for no global beyond the language
 * itself, and takes everything it reads as an argument. The
 * coercion in {@link toScore} repeats the reading `toFinite` in
 * `aggregate-score.ts` makes of the same column, deliberately and
 * as a second copy, because a spliced library cannot import a
 * sibling. `tests/build/lib-splice.test.ts` registers it and reads
 * what a real build made of it; `tests/lib/digest-assemble.test.ts`
 * drives it directly.
 */

// ---------------------------------------------------------------------------
// The one word this module supplies
// ---------------------------------------------------------------------------

/**
 * What a finding is called in a heading when the domain calls it
 * nothing of its own.
 *
 * Plural and capitalised, because the one place it is used is a
 * heading: the section under no category, which nothing else names.
 * A domain setting replaces it verbatim, so this constant is the
 * only string in the module whose casing is a decision rather than
 * an operator's.
 *
 * It is the table's own name rather than a synonym on purpose. No
 * alias reaches storage — the table stays `findings`, and so do its
 * columns, the queries and the API fields — so a domain that
 * declined the alias should see the word the rest of the system
 * uses rather than a second neutral term nothing else says.
 */
export const NEUTRAL_FINDINGS_DISPLAY_NAME = 'Findings';

// ---------------------------------------------------------------------------
// What a caller declares
// ---------------------------------------------------------------------------

/**
 * One finding, as much of it as this module reads.
 *
 * Four members, and everything else a caller's row carries travels
 * through untouched — the sections answer with the objects that
 * were handed in, not with copies narrowed to this interface. That
 * is what the type parameter on {@link assembleDigest} is for: a
 * caller handing rows of its own shape gets sections of that same
 * shape back, and a renderer reading a member this module never
 * heard of keeps its type.
 *
 * Every member is typed as widely as the boundary it crosses. A
 * finding reaches a Code node as JSON out of a Postgres node, where
 * a `numeric` column may arrive as a string rather than lose
 * digits, a `bigserial` id may arrive as one for the same reason,
 * and a timestamp arrives as text. The declared types say what may
 * arrive; the readings below say what is made of each.
 */
export interface DigestFinding {
  /**
   * The finding's surrogate key: the last tiebreak in the ordering,
   * and the only member of this interface that is never absent.
   *
   * A string as readily as a number, and both are read. See
   * {@link compareIds} for how the two are held against each other
   * and why the comparison is descending.
   */
  readonly id: number | string;

  /**
   * When the finding was created — the second tiebreak, after the
   * score and before the id.
   *
   * A `Date` for a caller reading through drizzle, a string for a
   * caller reading through a Postgres node. A value neither reading
   * can make a moment of sorts with the unscored tail rather than
   * against a moment nobody measured.
   */
  readonly createdAt?: Date | string | number | null;

  /**
   * How the finding scored, or nothing when it has not been scored.
   *
   * The primary key of the ordering, descending, with absence
   * sorted last rather than lowest. See the header.
   */
  readonly score?: number | string | null;

  /**
   * Which of the domain's categories this finding is filed under,
   * by the key `categories.key` holds.
   *
   * Absent, null, or a key the domain does not declare all land the
   * finding in the section under no category. See the header for
   * why those three share one section.
   */
  readonly categoryKey?: string | null;
}

/**
 * One of the domain's categories, as a section is made of it.
 *
 * The key is the section's identity and the label is what a reader
 * sees; a category naming no label is headed by its key, which is
 * the text an operator typed and so the honest thing to show.
 *
 * Nothing here is a `categories` row. The parent link, the depth
 * rule the table's trigger enforces and every other column are the
 * taxonomy's business — what a digest needs of a category is a key
 * to file under and a word to head it with.
 */
export interface DigestCategory {
  /**
   * The key this category is named by within its domain, unique
   * there by `categories_domain_id_key_unique`.
   *
   * Two entries naming one key is refused rather than collapsed —
   * see {@link assembleDigest}.
   */
  readonly key: string;

  /** What to head the section with, when it is not the key. */
  readonly label?: string | null;
}

/**
 * The slice of `DomainSettings` a digest reads: one member.
 *
 * Declared structurally rather than imported, because a spliced
 * library imports nothing at all — see the header. What it mirrors
 * is `DomainSettings.findingsDisplayName` in
 * `src/db/schema/domains.ts`, and a caller may hand the whole
 * settings payload straight in.
 */
export interface DigestVocabulary {
  /**
   * What this domain calls a finding when one is shown to a person.
   *
   * Absent, or present and blank, falls back to
   * {@link NEUTRAL_FINDINGS_DISPLAY_NAME}. Anything else is carried
   * through verbatim.
   */
  readonly findingsDisplayName?: string;
}

/**
 * Everything one digest is assembled from.
 *
 * Four members and a clock is not one of them. What period this
 * digest covers is the selection's own business — the query is
 * bounded by the stamp on the last stored briefing — so by the time
 * a pass reaches here the period is whatever these findings are.
 */
export interface DigestInput<Finding extends DigestFinding = DigestFinding> {
  /** The findings this pass selected, in any order. */
  readonly findings: readonly Finding[];

  /**
   * The domain's categories, in the order their sections should
   * appear. A domain declaring none gets the one section nobody
   * declares and nothing else.
   */
  readonly categories: readonly DigestCategory[];

  /**
   * Which sections this pass's selection actually read, by category
   * key, with `null` naming the section under no category.
   *
   * This is the member that separates a `0` from a `null` in a
   * section's count, and it is a claim the caller makes rather than
   * anything derivable from the findings. Omitting it claims
   * nothing was read; see the header for why that is the safe
   * direction and for the one thing that overrides the claim.
   */
  readonly sectionsRead?: readonly (string | null)[];

  /**
   * The domain's display settings, or nothing to take the neutral
   * word.
   */
  readonly settings?: DigestVocabulary | null;

  /**
   * The `runs.errors` value of the run that closed before this one,
   * whatever shape it arrived in.
   *
   * `unknown` rather than a list, because the column is
   * unannotated, is NOT NULL only by default, and carries entries
   * that share no shape. Read by {@link previousRunBanner}, which
   * carries a non-list rather than dropping it.
   */
  readonly previousErrors?: unknown;
}

// ---------------------------------------------------------------------------
// What comes back
// ---------------------------------------------------------------------------

/**
 * One section of a digest: a heading, a count, and the findings
 * filed under it in the order the assembly fixed.
 */
export interface DigestSection<
  Finding extends DigestFinding = DigestFinding,
> {
  /**
   * The category key this section is, or `null` for the one section
   * no domain declares.
   *
   * The identity a renderer matches on, kept separate from
   * {@link heading} because a heading is free text a domain may
   * change and a key is what the taxonomy is joined by.
   */
  readonly key: string | null;

  /**
   * What to head this section with: the category's label, its key
   * when it declared no label, or — for the section under no
   * category — what this domain calls a finding.
   *
   * Not composed. A renderer wanting to qualify the last one as
   * other or unfiled writes that phrase itself, because a phrase is
   * prose and prose is the renderer's.
   */
  readonly heading: string;

  /**
   * How many findings this section holds, or `null` when nothing
   * was read for it.
   *
   * `0` and `null` are different answers and the header argues the
   * difference at length: `0` says this bucket was read and was
   * empty, `null` says nobody looked. A section carrying findings
   * is never `null`, whatever the coverage list claimed.
   */
  readonly count: number | null;

  /**
   * The findings, ordered by {@link orderFindings}.
   *
   * The objects the caller handed in, not copies: a renderer reads
   * whatever its own rows carry. Empty whenever {@link count} is
   * `null`, and empty is also what a read-and-empty section holds —
   * the count is the only member that tells those two apart.
   */
  readonly findings: readonly Finding[];
}

/** The failures of the run that closed before this one. */
export interface DigestBanner {
  /**
   * One entry per failure, as `runs.errors` carried them.
   *
   * Carried and never read: an entry names a file that would not
   * parse, an endpoint that refused, or a contract that no longer
   * matches, and no shape holds across them.
   */
  readonly entries: readonly unknown[];

  /**
   * Whether the errors arrived as the list the column is meant to
   * hold.
   *
   * `false` means they did not, and that the whole value is the
   * single entry above. It is a fact about the run before this one
   * rather than about this digest, and it is reported rather than
   * repaired — a renderer can say the previous pass recorded its
   * failures in a shape nothing expected, which is more useful than
   * a banner that silently held one opaque entry.
   */
  readonly wellFormed: boolean;
}

/**
 * One period, assembled: the structured half of a briefing.
 *
 * This is what a caller stores in `briefings.payload` and what
 * every renderer under `src/exports/` reads back. The prose half is
 * the caller's model call and is no part of this value.
 */
export interface DigestAssembly<
  Finding extends DigestFinding = DigestFinding,
> {
  /**
   * What this domain calls a finding: its own alias, or
   * {@link NEUTRAL_FINDINGS_DISPLAY_NAME}.
   */
  readonly displayName: string;

  /**
   * Every section, in the order the caller declared its categories,
   * with the section under no category last.
   *
   * Always at least one member, since the last section is present
   * whether or not anything landed in it — a `null` count is how it
   * says nothing was read for it.
   */
  readonly sections: readonly DigestSection<Finding>[];

  /**
   * How many findings the pass selected in all, or `null` when
   * nothing was read for any section.
   *
   * Derived from the sections rather than measured separately, so
   * the two cannot disagree: a digest whose every section counts
   * `null` has no total either, and any other digest totals the
   * findings it was handed.
   */
  readonly total: number | null;

  /**
   * The previous run's failures, or `null` when it recorded none.
   *
   * `null` rather than an empty banner, so a renderer branches on
   * the member rather than on the length of a list — an empty
   * banner rendered is a heading with nothing under it.
   */
  readonly banner: DigestBanner | null;
}

// ---------------------------------------------------------------------------
// Reading what the rows arrived as
// ---------------------------------------------------------------------------

/**
 * A finding's score as a finite number, or `null` when it has none.
 *
 * The same reading `toFinite` in `aggregate-score.ts` gives the
 * same column, written a second time because a spliced library
 * imports nothing. Where the two differ is the one shape that
 * library preserves as a port reading and this one has no reason
 * to: a cell holding only whitespace is absence here rather than a
 * measured zero, since nothing about a digest was inherited from a
 * delimited export.
 *
 * A string is read because a `numeric` column reaching a Code node
 * through a Postgres node arrives as one rather than lose digits,
 * and refusing it would make every stored score absent — which is
 * the failure that puts a whole digest in the unscored tail while
 * every fixture-sized case stays green.
 *
 * @param value - Whatever the row carried in that column.
 * @returns The score, or `null` when there is none to read.
 */
function toScore(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value)
      ? value
      : null;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : null;
  }

  return null;
}

/**
 * A creation stamp as a number of milliseconds, or `null` when it
 * cannot be read as a moment.
 *
 * Three shapes are read because three shapes arrive: a `Date` from
 * drizzle, an ISO string from a Postgres node, and a number from
 * anything that already converted one. `Date.parse` answers `NaN`
 * for text that is not a date, and that is absence rather than the
 * epoch — a stamp read as zero would sort a finding as the oldest
 * thing in its section on the strength of a value nobody wrote.
 *
 * @param value - Whatever the row carried in that column.
 * @returns The moment in milliseconds, or `null`.
 */
function toMoment(value: unknown): number | null {
  if (value instanceof Date) {
    const time = value.getTime();

    return Number.isFinite(time)
      ? time
      : null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value)
      ? value
      : null;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Date.parse(value);

    return Number.isFinite(parsed)
      ? parsed
      : null;
  }

  return null;
}

// ---------------------------------------------------------------------------
// The ordering
// ---------------------------------------------------------------------------

/**
 * Two scores, best first, with absence behind every score there is.
 *
 * `null` is not the lowest score, it is the tail: an unscored
 * finding is not ranked against the scored ones at all. Two
 * unscored findings tie here and fall through to the stamp, which
 * is what keeps the tail in an order of its own rather than in
 * whatever order the selection happened to answer.
 *
 * @param left - The first score, or `null`.
 * @param right - The second score, or `null`.
 * @returns Negative when the first sorts earlier, positive when it
 * sorts later, zero when the two are not separated here.
 */
function compareScores(left: number | null, right: number | null): number {
  if (left === null && right === null) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  return right - left;
}

/**
 * Two creation stamps, newest first, with the unreadable ones
 * behind every stamp that could be read.
 *
 * Absence sorts last for the reason it does among the scores, and
 * it means something narrower here: not that nothing was measured,
 * but that what arrived is not a moment. Either way it is not a
 * time this ordering can put anywhere but the end.
 *
 * @param left - The first moment in milliseconds, or `null`.
 * @param right - The second, the same way.
 * @returns Negative, positive or zero, as {@link compareScores}.
 */
function compareMoments(left: number | null, right: number | null): number {
  if (left === null && right === null) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  return right - left;
}

/**
 * Two ids, later row first.
 *
 * DESCENDING, and that is the tiebreak agreeing with the one above
 * rather than a second unrelated rule: `findings.id` is a
 * `bigserial`, so among rows sharing a creation stamp the larger id
 * is the later insert. Ordering it the other way would put the
 * ordering in two minds — newest first until two rows tie to the
 * microsecond, oldest first after that.
 *
 * Numbers are compared as numbers when both read as finite ones,
 * because an id crossing a JSON boundary may arrive as a string and
 * a string comparison puts 9 after 10. Anything else falls back to
 * comparing the two as text, which is a total order over every pair
 * this can be handed and is the only claim made for it.
 *
 * @param left - The first id.
 * @param right - The second id.
 * @returns Negative, positive or zero, as {@link compareScores}.
 */
function compareIds(left: unknown, right: unknown): number {
  const leftNumber = toScore(left);
  const rightNumber = toScore(right);

  if (leftNumber !== null && rightNumber !== null) {
    return rightNumber - leftNumber;
  }

  const leftText = String(left);
  const rightText = String(right);

  if (leftText === rightText) {
    return 0;
  }

  return leftText < rightText
    ? 1
    : -1;
}

/**
 * Where one finding sorts against another: score, then stamp, then
 * id.
 *
 * Exported because more than one thing has to agree with it. The
 * selection statement in `ar-digest` orders in SQL over the same
 * three columns before this module ever sees the rows, and a
 * renderer laying out a section relies on the order it was handed;
 * one comparator written down once is what those readings are held
 * against.
 *
 * @param left - The first finding.
 * @param right - The second finding.
 * @returns Negative when the first sorts earlier, positive when it
 * sorts later, zero when the two are indistinguishable to all
 * three keys.
 */
export function compareFindings(
  left: DigestFinding,
  right: DigestFinding,
): number {
  const byScore = compareScores(toScore(left.score), toScore(right.score));

  if (byScore !== 0) {
    return byScore;
  }

  const byMoment = compareMoments(
    toMoment(left.createdAt),
    toMoment(right.createdAt),
  );

  if (byMoment !== 0) {
    return byMoment;
  }

  return compareIds(left.id, right.id);
}

/**
 * The findings a pass selected, in the order a digest shows them.
 *
 * A NEW array every time. The input is not sorted in place, because
 * a caller handing the same list to two sections — or to this and
 * then to something else — would otherwise find the second call
 * reading an order the first one imposed.
 *
 * @param findings - The findings, in any order.
 * @returns A new array holding them ordered by
 * {@link compareFindings}.
 */
export function orderFindings<Finding extends DigestFinding>(
  findings: readonly Finding[],
): Finding[] {
  return [...findings].sort(compareFindings);
}

// ---------------------------------------------------------------------------
// The vocabulary and the banner
// ---------------------------------------------------------------------------

/**
 * A list as this module can walk it.
 *
 * The declared types already say each of these is an array, and
 * this does not trust them, for the reason every reading above
 * takes a wider type than the column: the whole input crosses a
 * JSON boundary on its way into a Code node, where a type is a
 * claim about the query rather than a guarantee about what arrived.
 * An absent list reads as an empty one, which costs a digest a
 * section rather than costing the pass an exception.
 *
 * @param value - Whatever the caller supplied, if anything.
 * @returns The list, or an empty one.
 */
function asList<Item>(value: readonly Item[] | undefined): readonly Item[] {
  return Array.isArray(value)
    ? value
    : [];
}

/**
 * What this domain calls a finding.
 *
 * The domain's own alias when it declared one, and
 * {@link NEUTRAL_FINDINGS_DISPLAY_NAME} otherwise. A value that is
 * not a string, and one whose whole content is whitespace, are both
 * read as no alias — a heading made of spaces is a heading nobody
 * can see, and falling back is the only reading that leaves one.
 *
 * Anything else is carried through EXACTLY as the operator wrote
 * it, spacing included. Trimming would be a repair, and repairing
 * an operator's own label is what leaves them looking at text they
 * did not write with nothing saying who changed it.
 *
 * @param settings - The domain's display settings, if any.
 * @returns The word to head findings with.
 */
export function displayNameFor(settings?: DigestVocabulary | null): string {
  const declared = settings?.findingsDisplayName;

  return typeof declared === 'string' && declared.trim() !== ''
    ? declared
    : NEUTRAL_FINDINGS_DISPLAY_NAME;
}

/**
 * The previous run's failures, as a banner or as nothing.
 *
 * Three answers over four shapes, and the third is the one this
 * function exists for.
 *
 * NOTHING RECORDED is `null`: the column absent, or holding the
 * empty list it defaults to. A pass that failed at nothing has no
 * banner, and an empty banner rendered is a heading with nothing
 * under it.
 *
 * A LIST WITH ENTRIES becomes a banner over a copy of it, so a
 * later push by the caller cannot reach inside a value this
 * function already answered.
 *
 * ANYTHING ELSE becomes a banner over that whole value as its
 * single entry, marked {@link DigestBanner.wellFormed} false. The
 * column is unannotated jsonb whose NOT NULL is a default rather
 * than a check on what goes in it, so a non-list is storable — and
 * the pass that wrote one is a pass something went wrong in.
 * Dropping it is the one answer that makes that run look clean.
 *
 * @param errors - The `runs.errors` value of the previous run,
 * whatever shape it arrived in.
 * @returns The banner, or `null` when nothing was recorded.
 */
export function previousRunBanner(errors: unknown): DigestBanner | null {
  if (errors === null || errors === undefined) {
    return null;
  }

  if (Array.isArray(errors)) {
    const entries: readonly unknown[] = [...errors];

    return entries.length === 0
      ? null
      : { entries, wellFormed: true };
  }

  return { entries: [errors], wellFormed: false };
}

// ---------------------------------------------------------------------------
// The sections
// ---------------------------------------------------------------------------

/**
 * Every section key the domain declared, checked as it is
 * collected.
 *
 * The one refusal this module makes, and it is over the sectioning
 * rather than over any finding. Two categories naming one key
 * produce two sections a renderer cannot tell apart, and every
 * finding under that key lands in whichever came first — so one
 * section shows the whole bucket, the other shows an empty one
 * counted `0`, and nothing anywhere says which. A key that is not a
 * non-empty string is the same fault reached from the other side: a
 * section nothing can head and nothing can be filed under.
 *
 * Refusing costs the pass and names the key, which is the trade
 * `sourceHealth` in `source-health.ts` makes for its own one
 * refusal. Naming the key is safe under the no-echo rule for the
 * reason a threshold is: a category key is operator-authored
 * configuration on its way into an operator's own log, not payload
 * text a source supplied.
 *
 * `categories_domain_id_key_unique` already forbids the duplicate
 * in the table, so a key arriving twice came from the assembly of
 * this call rather than from the taxonomy — which is exactly the
 * fault a refusal here reports and a database constraint cannot.
 *
 * @param categories - The domain's categories, as declared.
 * @returns Every declared key.
 * @throws {Error} When a category names no usable key, or when two
 * of them name one section.
 */
function declaredKeys(categories: readonly DigestCategory[]): Set<string> {
  const keys = new Set<string>();

  for (const category of categories) {
    const key = category.key;

    if (typeof key !== 'string' || key === '') {
      throw new Error(
        '[digest-assemble] every category has to name its section '
        + 'with a non-empty key. A category that names none heads '
        + 'nothing and can hold nothing, so a digest built over it '
        + 'would drop that bucket without saying so.',
      );
    }

    if (keys.has(key)) {
      throw new Error(
        `[digest-assemble] two categories name the section ${key}. `
        + 'One of them would show the whole bucket and the other an '
        + 'empty section counted zero, with nothing saying which is '
        + 'which. The table forbids the pair, so this one was built '
        + 'here.',
      );
    }

    keys.add(key);
  }

  return keys;
}

/**
 * Which section a finding is filed under.
 *
 * A declared key files it there; absence, a null, a value that is
 * not a string and a key this domain does not declare all file it
 * under `null`, which is the section nobody declares. The header
 * argues why those last four share one section rather than being
 * dropped or split.
 *
 * @param finding - The finding, as the caller handed it over.
 * @param declared - Every key the domain declared.
 * @returns The section key, or `null`.
 */
function sectionKeyOf(
  finding: DigestFinding,
  declared: ReadonlySet<string>,
): string | null {
  const key = finding.categoryKey;

  return typeof key === 'string' && declared.has(key)
    ? key
    : null;
}

/**
 * What to head a declared category's section with.
 *
 * Its label when it wrote one, and its key otherwise. A key is free
 * text an operator chose rather than an identifier this schema
 * generated, so showing it is showing something a person wrote —
 * which is the whole reason it is a usable fallback.
 *
 * @param category - The category, as declared.
 * @returns The heading.
 */
function headingOf(category: DigestCategory): string {
  const label = category.label;

  return typeof label === 'string' && label.trim() !== ''
    ? label
    : category.key;
}

/**
 * One section, over the findings that were filed under it.
 *
 * The count is where the null-vs-zero rule is applied, and it is a
 * disjunction rather than a lookup: a section is counted when the
 * caller named it read OR when findings landed in it. The second
 * half is what stops a coverage list the caller forgot to extend
 * from answering `null` over a section whose own rows contradict
 * it — the findings are evidence and the list is an assertion.
 *
 * @param key - The category key, or `null` for the one section no
 * domain declares.
 * @param heading - What to head it with.
 * @param held - Every finding, bucketed by section key.
 * @param read - The section keys the caller named as read.
 * @returns The section.
 */
function sectionOf<Finding extends DigestFinding>(
  key: string | null,
  heading: string,
  held: ReadonlyMap<string | null, readonly Finding[]>,
  read: ReadonlySet<string | null>,
): DigestSection<Finding> {
  const inside = held.get(key) ?? [];
  const counted = read.has(key) || inside.length > 0;

  return {
    key,
    heading,
    count: counted
      ? inside.length
      : null,
    findings: orderFindings(inside),
  };
}

// ---------------------------------------------------------------------------
// The assembly
// ---------------------------------------------------------------------------

/**
 * One period's digest, as structure.
 *
 * Four steps and no side effects: bucket the findings by the
 * section each is filed under, order each bucket, count each
 * section under the null-vs-zero rule, and carry the previous run's
 * failures into a banner. Nothing is read from a clock, a query or
 * a model, and the value that comes back is what a caller stores in
 * `briefings.payload` and every renderer under `src/exports/` reads
 * back.
 *
 * SECTION ORDER IS THE CALLER'S, category by category, with the
 * section under no category last. Last rather than first because it
 * is the one section a domain did not ask for, and a renderer
 * reading the list in order should reach the domain's own taxonomy
 * before it reaches the remainder.
 *
 * FINDINGS ARE THE OBJECTS THAT CAME IN. Nothing is copied, narrowed
 * or rebuilt, so a caller reading a member this module never heard
 * of finds it where it was. The input list itself is not sorted —
 * see {@link orderFindings}.
 *
 * THE TOTAL IS DERIVED from the sections rather than measured
 * beside them, so a digest cannot report a total its sections
 * disagree with. It is `null` in exactly one case: every section
 * counted `null`, which is a pass that read nothing and is a
 * different thing from a pass that read everything and found
 * nothing.
 *
 * @param input - The findings, the taxonomy, what was read, the
 * domain's display settings and the previous run's errors.
 * @returns The structured half of one briefing.
 * @throws {Error} When the categories name no usable key, or two of
 * them name one section. See {@link declaredKeys}.
 */
export function assembleDigest<Finding extends DigestFinding>(
  input: DigestInput<Finding>,
): DigestAssembly<Finding> {
  const findings = asList(input.findings);
  const categories = asList(input.categories);
  const declared = declaredKeys(categories);
  const read = new Set<string | null>(asList(input.sectionsRead));
  const held = new Map<string | null, Finding[]>();

  for (const finding of findings) {
    const key = sectionKeyOf(finding, declared);
    const bucket = held.get(key);

    if (bucket === undefined) {
      held.set(key, [finding]);
    } else {
      bucket.push(finding);
    }
  }

  const displayName = displayNameFor(input.settings);
  const sections: readonly DigestSection<Finding>[] = [
    ...categories.map((category) => sectionOf(
      category.key,
      headingOf(category),
      held,
      read,
    )),
    sectionOf(null, displayName, held, read),
  ];

  return {
    displayName,
    sections,
    total: sections.every((section) => section.count === null)
      ? null
      : findings.length,
    banner: previousRunBanner(input.previousErrors),
  };
}
