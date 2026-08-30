/**
 * @packageDocumentation
 * source-health — fail, flag, keep, as arithmetic over four columns
 * of one `sources` row.
 *
 * A pass fetches a source and gets one of two endings: a payload the
 * contract accepted, or anything else. This is what that ending means
 * for the row. Given the counters and stamps the row carries now and
 * the outcome that just happened, it answers the
 * `consecutive_failures`, `last_success_at`, `last_failure_at` and
 * `flagged` values the row should carry next — and nothing else. No
 * update is issued here, no row is read, and no decision is made
 * about whether the source should have been fetched at all.
 *
 * The three words are three different columns, and separating them
 * is the whole design. FAIL is `documents.parse_status`, written by
 * whoever stored the payload, and `contractErrors` in
 * `parser-config.ts` is the answer that decides it. KEEP is
 * `documents.raw`, written before any of this runs, so a divergence
 * leaves evidence rather than a gap. FLAG is `sources.flagged`, and
 * it is the only one of the three this module has an opinion about:
 * a single failure says nothing, and a RUN of them says the adapter
 * has rotted.
 *
 * ## `flagged` and `enabled` are two answers with two writers
 *
 * `sources.flagged` says the pipeline believes something here has
 * stopped working. `sources.enabled` says whether the pipeline reads
 * the source at all. They look like one boolean read twice and they
 * are not, and the column comments in `src/db/schema/sources.ts` say
 * so from the schema's side: collapsing them would let the detector
 * switch off a feed an operator deliberately turned on, and would
 * leave no way to record a suspect source still worth reading.
 *
 * This module writes one of them. Nothing it answers carries an
 * `enabled` member — not as a passthrough, not as an unchanged copy
 * — because an answer that mentions a column is an answer somebody
 * will eventually apply to it, and the caller's UPDATE is built from
 * these members. So the omission is the enforcement, and it is why
 * {@link SourceHealthState} is four members rather than a `sources`
 * row with four of them recomputed.
 *
 * The rule runs the other way too, and it is the surprising half:
 * `flagged` is SET here and never CLEARED here. A success after a
 * flag resets the counter to zero and leaves the flag standing.
 * Clearing it is an operator's act, because clearing it is a claim
 * this module cannot make — the detector saw a run of failures stop,
 * which is what a source that is genuinely fixed looks like and also
 * what a source answering a cached page, an error document with a
 * 200, or an empty result set looks like. A flag that cleared itself
 * would make the one signal that survives a pass into a signal that
 * lasts until the next pass.
 *
 * ## A success resets the counter to a real `0`
 *
 * Not to `null`, and the null-vs-zero rule this repository applies
 * everywhere is what decides it rather than a preference about
 * empty values. `consecutive_failures` is a COUNT: a source whose
 * last fetch worked genuinely has no failures behind it, so zero is
 * a reading and not an absence. There is no earlier state in which
 * the count is unknown, which is exactly the condition the column is
 * NOT NULL DEFAULT 0 for.
 *
 * The two timestamps beside it are the opposite case and are treated
 * as one. A time has no real zero — any placeholder stood in for one
 * would date a success or a failure that never happened — so a
 * source that has never succeeded carries `last_success_at` as
 * `null`, and this module carries that null through every failure it
 * is handed rather than filling it in. A row whose counter reads `3`
 * and whose `last_success_at` reads `null` is a source that has
 * never once worked, and that is a different diagnosis from one that
 * worked last week.
 *
 * The consequence for a comparison is worth stating because it is
 * where a null would silently win. Which of the two stamps is more
 * recent is what says whether a source is broken right now, and a
 * comparison against NULL is neither true nor false — so a query
 * reading these columns has to say what it wants for a source that
 * has never succeeded, and cannot be handed a zero that quietly
 * answers for it.
 *
 * ## No clock, and no opinion about what a moment is
 *
 * The moment arrives as {@link FetchOutcome.at} and comes back out
 * in whichever of the two stamps moved, unchanged and unexamined. It
 * is not parsed, not normalised, and not compared against anything.
 *
 * Two reasons, and the second is the one that binds. A pass writing
 * several rows wants ONE moment across all of them, so the moment
 * has to be the caller's rather than read from a clock per call —
 * and this module has no clock it could agree with anyway, since the
 * `Date` a Code node sees is the instance's and the `now()` the
 * UPDATE could have used is the database's. And the representation
 * is not this module's to choose: a caller writing through drizzle
 * holds a `Date`, a caller building SQL in a Code node holds a
 * string, and either normalisation would be wrong for one of them.
 *
 * So the answer is a decision about WHICH stamp moves, and the
 * caller keeps the decision about what a moment is. A caller handing
 * in something that is not one gets it back in the column it named.
 *
 * ## The one refusal
 *
 * A threshold that is not a positive integer is refused rather than
 * defaulted, which is not how `SHINGLE_THRESHOLD` in `shingle.ts`
 * treats a bad argument, and the difference is worth being exact
 * about. That library keeps a silent fallback because it is a port
 * and the fallback is the original's reading. This one has no
 * original, so the question is open, and both of the ways a bad
 * threshold fails are silent: a value at or below zero flags every
 * source it is applied to, and a `NaN` — which is what an unparsed
 * setting becomes — flags none of them ever.
 *
 * Nothing here clears a flag, so neither outcome is corrected by a
 * later pass. The first leaves every source in the domain flagged
 * and an operator clearing them by hand; the second leaves a rot
 * detector that has been off for as long as the setting has been
 * wrong, reporting nothing the whole time. A refusal on the first
 * call of a run costs that run and names the setting.
 *
 * The refusal names the value, which the validators in
 * `parser-config.ts` deliberately never do. The rule there is about
 * PAYLOAD content — untrusted text bound for `documents.parse_error`
 * and rendered by exports — and a threshold is operator-owned
 * configuration on its way to an operator's own log. The no-echo
 * rule is about where a value came from, not about severity.
 *
 * ## Dual context
 *
 * Like every module under `src/lib/`, this one is imported by the
 * default suite AND spliced into a workflow Code node body by
 * `scripts/build-workflows.ts`. So it imports nothing, keeps no
 * state between calls, reaches for no global beyond the language
 * itself, and takes everything it reads as an argument.
 * `tests/build/lib-splice.test.ts` registers it and reads what a
 * real build made of it; `tests/lib/source-health.test.ts` drives it
 * directly.
 */

// ---------------------------------------------------------------------------
// The bound
// ---------------------------------------------------------------------------

/**
 * How many consecutive failures flag a source, when a caller names
 * no threshold of its own.
 *
 * Five, and the number is a judgement about two costs rather than a
 * measurement. A source is fetched on its topic's schedule, so a
 * threshold is denominated in PASSES and not in hours: at the
 * shortest cadences a run of five is under a working day, and at the
 * longest it is a week. Below three, a provider having a bad
 * afternoon flags a source that is fine, and the flag then sits there
 * until somebody clears it by hand. Far above five, a source that has
 * genuinely rotted keeps being fetched, and every one of those passes
 * writes a `documents.raw` nobody will read.
 *
 * One number in one place, so a workflow, a test and an operator
 * reading a flagged row all mean the same thing by "a run of
 * failures". The `sources` table carries no per-source threshold
 * column and this module does not ask for one — the override below
 * exists for a caller with a reason, not as a per-row setting with
 * nowhere to live.
 */
export const CONSECUTIVE_FAILURE_THRESHOLD = 5;

// ---------------------------------------------------------------------------
// What a caller declares, and what comes back
// ---------------------------------------------------------------------------

/**
 * A moment, in whatever shape the caller holds one.
 *
 * A `Date` for a caller writing through drizzle, a string for a
 * caller building SQL in a Code node. Nothing here reads either, for
 * the reason the header gives: the representation belongs to whoever
 * writes the column.
 */
export type SourceMoment = Date | string;

/**
 * The four columns of a `sources` row this module has an answer for
 * — as the row carries them now, and as it should carry them next.
 *
 * One interface for both ends, because they are the same four
 * readings about the same row and a second name for the second half
 * would only invite the two to drift. What a caller does with an
 * answer is issue an UPDATE over exactly these members.
 *
 * There is no `enabled` here and no `id`, deliberately in both
 * cases. The first is an operator's column and is argued in the
 * header; the second would make this a row rather than a reading,
 * and a function handed a row is a function somebody will eventually
 * hand a whole `sources` row including the two columns above.
 */
export interface SourceHealthState {
  /**
   * How many fetches in a row have failed, ending with the most
   * recent one. A count, so `0` is a reading: this source's last
   * fetch worked, or it has never been fetched at all.
   */
  readonly consecutiveFailures: number;

  /**
   * When this source last answered with a payload the contract
   * accepted, or `null` when it never has.
   */
  readonly lastSuccessAt: SourceMoment | null;

  /** When it last failed, or `null` when it never has. */
  readonly lastFailureAt: SourceMoment | null;

  /**
   * Whether the rot detector has fired for this source.
   *
   * Set here when the counter reaches the threshold and never
   * cleared here. A caller reading an answer can see that it was
   * newly set by comparing this against the state it handed in;
   * nothing reports it, because a second member saying so would be
   * derivable from the first two and would need its own rules for
   * the case where a flag was already standing.
   */
  readonly flagged: boolean;
}

/** One fetch, as it ended. */
export interface FetchOutcome {
  /**
   * Whether the source answered with a payload the contract
   * accepted.
   *
   * Read strictly: anything that is not exactly `true` is a failure.
   * The value crosses a JSON boundary on its way into a Code node,
   * and the two ways of being wrong about it are not symmetric — an
   * ambiguous outcome read as a failure bumps a counter an operator
   * can see and a later success resets, while the same outcome read
   * as a success clears the streak and leaves a rotted source
   * looking healthy for as long as it keeps rotting.
   */
  readonly succeeded: boolean;

  /**
   * When it happened, in the caller's own representation.
   *
   * Carried into whichever stamp moved and into nothing else. A pass
   * covering several sources should hand the same moment to each of
   * them, so the rows it writes agree about when the pass ran.
   */
  readonly at: SourceMoment;
}

/** What a caller may say instead of the default bound. */
export interface SourceHealthOptions {
  /**
   * How many consecutive failures flag the source, overriding
   * {@link CONSECUTIVE_FAILURE_THRESHOLD}.
   *
   * Absent means the default. Present and not a positive integer is
   * refused — see {@link sourceHealth} for why that is a throw here
   * and a silent fallback in the libraries beside it.
   */
  readonly consecutiveFailureThreshold?: number;
}

// ---------------------------------------------------------------------------
// Reading what the row carried in
// ---------------------------------------------------------------------------

/**
 * The counter a row arrived with, as a number this module can add to.
 *
 * The declared type says `number` and this guard does not trust it,
 * which is the same allowance `sketchesConverge` in `shingle.ts`
 * makes and for the same reason: the row crosses a JSON boundary on
 * its way into a Code node, and a type is a claim about the column
 * rather than a guarantee about the value that arrived.
 *
 * Anything that is not a non-negative integer reads as `0`, so the
 * streak restarts at the outcome being judged. That direction is
 * chosen rather than defaulted. Reading an unusable counter as zero
 * means at worst a rot detector that takes a few more passes to
 * fire, and every one of those passes writes a stored document
 * saying why; reading it as anything larger would flag a source on
 * the strength of a number nobody wrote, and nothing here clears a
 * flag.
 *
 * @param value - Whatever the row carried in that column.
 * @returns The streak so far, or `0` when it cannot be read as one.
 */
function priorFailures(value: number): number {
  return Number.isInteger(value) && value >= 0
    ? value
    : 0;
}

/**
 * The threshold this call is judged against.
 *
 * @param options - Whatever the caller passed, if anything.
 * @returns The caller's threshold, or the default bound.
 * @throws {Error} When a threshold is named and is not a positive
 * integer.
 */
function thresholdFrom(options?: SourceHealthOptions): number {
  const declared = options?.consecutiveFailureThreshold;

  if (declared === undefined) {
    return CONSECUTIVE_FAILURE_THRESHOLD;
  }

  if (!Number.isInteger(declared) || declared <= 0) {
    throw new Error(
      '[source-health] the consecutive-failure threshold must be a ' +
      `positive integer, not ${declared}. Nothing here ever clears ` +
      'flagged, so a threshold that is not one either flags every ' +
      'source it is applied to or flags none of them for as long as ' +
      'the setting stands, and no later pass corrects either.',
    );
  }

  return declared;
}

// ---------------------------------------------------------------------------
// The decision
// ---------------------------------------------------------------------------

/**
 * What one fetch outcome makes of a source's health columns.
 *
 * The whole of it is four assignments and they are worth reading as
 * four separate answers rather than as one branch on the outcome.
 *
 * The COUNTER is `0` on a success and one more than the streak on a
 * failure. Zero rather than null, for the reason the header gives at
 * length: a count has a real zero and this is it.
 *
 * The STAMPS move one at a time and the other is carried through
 * untouched. A failure never writes `last_success_at`, so a source
 * that has never succeeded keeps its `null` however long the streak
 * runs — which is what makes the pair of columns able to say
 * never-worked and used-to-work as different things.
 *
 * The FLAG is the only member with any arithmetic behind it, and it
 * is a disjunction rather than a comparison: a flag already standing
 * survives every outcome, including a success. Crossing is `>=`
 * rather than `===`, so a counter that arrived past the bound — a
 * threshold lowered between passes, a row edited by hand — flags on
 * the next failure instead of stepping over the one value that would
 * have caught it.
 *
 * A success cannot flag, and that falls out rather than being
 * special-cased: the counter is `0` and the threshold is a positive
 * integer, so the comparison is false for every threshold this
 * function accepts. That is why the refusal above is a refusal —
 * with a threshold of zero the same expression flags on every
 * outcome there is, success included.
 *
 * Nothing is written. The answer is a value the caller puts in an
 * UPDATE, and this function neither knows nor asks whether that
 * UPDATE happened. Two consequences a caller owns: an outcome judged
 * and not written is an outcome that did not happen as far as the
 * next pass is concerned, and the same outcome judged twice counts
 * twice.
 *
 * @param prior - The four columns as the row carries them now.
 * @param outcome - How the fetch ended, and when.
 * @param options - The threshold, when it is not the default.
 * @returns The four values the row should carry next.
 * @throws {Error} When `options` names a threshold that is not a
 * positive integer.
 */
export function sourceHealth(
  prior: SourceHealthState,
  outcome: FetchOutcome,
  options?: SourceHealthOptions,
): SourceHealthState {
  const threshold = thresholdFrom(options);
  const succeeded = outcome.succeeded === true;
  const failures = succeeded
    ? 0
    : priorFailures(prior.consecutiveFailures) + 1;

  return {
    consecutiveFailures: failures,
    lastSuccessAt: succeeded
      ? outcome.at
      : prior.lastSuccessAt,
    lastFailureAt: succeeded
      ? prior.lastFailureAt
      : outcome.at,
    flagged: prior.flagged === true || failures >= threshold,
  };
}
