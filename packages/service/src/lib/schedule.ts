/**
 * @packageDocumentation
 * Scheduling arithmetic — the rules `ar-dispatch` applies to a row it has
 * claimed, expressed as TypeScript.
 *
 * The dispatcher holds the only schedule trigger in the system, and
 * carries it already — it wakes on its own cron, and one node behind that
 * takes the `topics` rows that are enabled and whose `next_run_at` has
 * passed, oldest first and capped by a `LIMIT`, moving each row it takes
 * forward in the same statement that claims it. A second node beside it
 * does the same over `export_subscriptions`, so both schedulable tables
 * are claimed and rescheduled by one statement shape. That reschedule is
 * {@link clampIntervalSeconds} written as SQL. A Merge node behind the
 * pair hands both branches' claims on as one stream. What arrives later in
 * this stage is the rest of a tick: that cap applied a second time over
 * that stream. The arithmetic behind all of it lives here and nothing
 * around it. The columns it reads are the schedulable set declared in
 * `src/db/schema/scheduling.ts`, and it reads them as values handed in —
 * no I/O, no clock, no database handle. A rule reaching for one of those
 * could neither be spliced into a node nor be tested without the thing it
 * reached for.
 *
 * Dual-context is what shapes the file. A workflow source writing
 * `__INLINE:schedule.ts__` has this module transpiled and spliced into its
 * Code node body by `scripts/build-workflows.ts`, so a node runs the same
 * function the default suite imports rather than a second copy of it
 * written in JavaScript for the canvas. That is the whole of what the
 * marker buys: two copies of one rule agree until the day they do not, and
 * the day they stop agreeing is a schedule that behaves one way in a test
 * and another way on an instance. A Code node is not a module — nothing
 * resolves a specifier for it — so the build refuses a library carrying a
 * form a Code node cannot run rather than writing an artifact that fails
 * when the node is next reached.
 *
 * Three rules are the whole of what dual-context costs a file here,
 * and the first two are about what a library says at its edges. No
 * value import: a dependency that survives the transpile has nothing
 * to resolve it on a node. A type-only import is not one, since
 * `import type` erases before the build reads the source at all, and
 * an `interface`, a `type` alias and a generic signature erase with
 * it — the rule costs a library no type surface whatever. Declaration
 * forms only for exports: `export function`, `export const`,
 * `export class`, `export let` and `export var` have the keyword
 * taken off and reach the node as the declarations they already were,
 * while `export {`, `export default` and `export *` name a module
 * boundary that will not be there and that no strip can repair.
 *
 * The third rule is that nothing may rely on module scope, and it is
 * the one the paragraph above does not reach. `assertSpliceable` in
 * `scripts/workflow-markers.ts` refuses the first two, so a library
 * breaking either is never built into an artifact at all; this one it
 * cannot see. Measured on the transpiler the build uses, `require(p)`,
 * an `import(p)` whose specifier is a variable, `import.meta.url` and
 * a top-level `let` all scan with an empty import list and survive the
 * transpile unchanged, which is to say they are indistinguishable from
 * this file. Only a dynamic `import()` written against a literal
 * specifier is caught, and then as a dependency rather than as what it
 * is.
 *
 * So the third rule is satisfied rather than checked, and what it
 * costs to break splits in two. A reach for something only a module
 * has fails loudly on the node — `require` raises a `ReferenceError`
 * when the line is reached, `import.meta` will not parse there at
 * all. Module-level STATE fails quietly instead: a counter or a memo
 * lives as long as the process that imported this file, and only as
 * long as the one execution that ran the spliced copy, and neither
 * context reports the difference. {@link clampIntervalSeconds} and
 * {@link capBatch} therefore take everything they read as an argument
 * and keep nothing between calls. `tests/build/schedule-splice.test.ts`
 * is the nearest thing to a check on that: it puts this library through
 * the shipped build and then through `new Function`, which supplies no
 * `require` and no `module` exactly as a Code node does not. An
 * `import.meta` is refused when that function is CONSTRUCTED, whether
 * or not a case ever reaches the line; a `require` raises only when its
 * line is reached, so a case table exercising that path is what would
 * see it; and module-level state stays invisible in both contexts.
 *
 * `src/lib/` is this package's pipeline half; the framework `lib/` at the
 * package root is the fork-style copy of the service template and stays
 * reserved for it. The two are never merged, and
 * `docs/architecture/00-overview.md` carries that argument in full. The
 * half of it that bites a reader of this file is the import specifier: a
 * `../../lib/…` written here reaches the framework, exactly as it does
 * from `src/redis/`, while the same text written one directory deeper —
 * where phase 4 puts the ported parsing libs — names a sibling pipeline
 * lib instead.
 */

/**
 * The bounds a schedulable row puts on its own interval, as the
 * `min_interval_seconds` and `max_interval_seconds` columns carry them.
 * A null bound is an absent one: that side of the range is unlimited.
 *
 * Named for the columns rather than for the sides, so a claimed row
 * satisfies this as it stands and no renaming step sits between the
 * query and the rule.
 */
export interface IntervalBounds {
  /**
   * The shortest interval this row may be run at, in seconds, or null
   * for no floor.
   */
  readonly minIntervalSeconds: number | null;

  /**
   * The longest it may go between runs, in seconds, or null for no
   * ceiling.
   */
  readonly maxIntervalSeconds: number | null;
}

/**
 * Clamp a proposed interval into the bounds its own row carries.
 *
 * A null bound is skipped rather than stood in for, which is not the
 * same thing: a missing ceiling leaves the floored value alone, where
 * a ceiling taken to be the proposal itself would cap it back to what
 * was handed in and leave the floor doing nothing. A row carrying
 * neither bound gets back exactly what it was handed. Nothing here
 * refuses a proposal either — every input has an answer, and where the
 * bounds do not reach it that answer is the proposal itself.
 *
 * The floor is applied first and the ceiling second, so bounds that
 * cross — a floor above the ceiling, which nothing refuses on the way
 * into the row — resolve to the ceiling. That is the contract rather
 * than a consequence of reading one column before the other, and it is
 * what a caller can rely on for a row whose two bounds disagree.
 *
 * The rule is expressed twice on purpose, and the second copy is SQL.
 * `ar-dispatch` claims a row and moves its `next_run_at` forward in one
 * statement — the claim holds its lock until the reschedule is written
 * — so the clamp there is an expression over the bound columns rather
 * than a call into this function. The expression both of the
 * dispatcher's claims carry, over `topics` and over
 * `export_subscriptions`, is `LEAST(max_interval_seconds,
 * GREATEST(min_interval_seconds, interval_seconds))`, which skips a
 * null bound the way this function does: `LEAST` and `GREATEST` are
 * documented to ignore a NULL argument outright. Standing a missing
 * bound in with `COALESCE(max_interval_seconds, interval_seconds)` is
 * the shape to avoid rather than belt and braces over a null-safe one —
 * it caps the floored value straight back down to the proposal, so the
 * floor does nothing at all for exactly the rows carrying a floor and
 * no ceiling.
 *
 * A case table is what holds the two together. The same rows drive this
 * function in `tests/lib/schedule.test.ts` and the SQL expression in
 * `tests/live/schedule-clamp.live.test.ts`, which asserts the two agree
 * row for row against a real Postgres — the only seam in this package
 * reading both sides, and the only place the null handling above is
 * evidence rather than a reading of the Postgres manual. The rows
 * themselves live in `tests/lib/schedule-cases.ts`, so those two files
 * are driven over the same ones rather than over two lists that agree
 * until somebody edits one. The lib case reads that table today; the
 * live one arrives later in this plan and self-skips without
 * `AR_LIVE_DATABASE_URL`, so a default suite run exercises this
 * function alone and says nothing about the expression it is meant to
 * agree with. The row carrying that comparison is a floor with no
 * ceiling, since every other combination of bounds agrees under the
 * COALESCE form too.
 *
 * What the bounds bound is a PROPOSAL. No CHECK relates the two
 * columns to `interval_seconds` or to `next_run_at`, so calling this is
 * the whole of the enforcement: a hand-written UPDATE at a psql prompt,
 * a seeded row or a workflow node writing a due time directly is taken
 * as it stands, and the row then sits outside its own bounds with
 * nothing to report it. A value that came back from here is therefore a
 * claim about that value and not about the row afterwards — the agent
 * path stays inside the limits a person set for as long as the writers
 * on it keep asking.
 *
 * @param intervalSeconds - The interval being proposed, in seconds.
 * @param bounds - The row's own floor and ceiling.
 * @returns The proposal, moved no further than the bounds require.
 */
export function clampIntervalSeconds(
  intervalSeconds: number,
  bounds: IntervalBounds,
): number {
  const floored = bounds.minIntervalSeconds === null
    ? intervalSeconds
    : Math.max(intervalSeconds, bounds.minIntervalSeconds);

  return bounds.maxIntervalSeconds === null
    ? floored
    : Math.min(floored, bounds.maxIntervalSeconds);
}

/**
 * Take at most `cap` items off the front of a batch.
 *
 * The order handed in is the order kept, and the tail is what goes.
 * `ar-dispatch` claims oldest-due first, so the rows past the cap are
 * the least overdue ones and a capped pass is the front of the queue
 * rather than a sample of it. The batch comes back as a new array
 * whether or not the cap bit, so nothing a caller still holds is
 * trimmed underneath it.
 *
 * A cap that is not a positive integer is refused rather than handed
 * to `slice`, which has a plausible-looking answer for every one of
 * them and reports none. `0` and `NaN` both come back empty, which is
 * indistinguishable from a tick with no work due. A negative counts
 * from the far end, so it drops that many and carries the rest — a
 * bound that grows with the backlog it was meant to hold back. A
 * fraction truncates, so the pass runs at a cap nobody wrote. And
 * `Infinity` carries the lot, which is the one outcome this function
 * exists to make impossible. None of those is exotic: the cap reaches
 * a Code node as resolved setting text, and `Number` turns an
 * unparseable one into `NaN` and an empty one into `0`.
 *
 * The refusal is a plain `Error` carrying the value it was handed
 * rather than a class of its own. This function is spliced into a
 * Code node, where a throw reaches an operator as its message and a
 * constructor name crosses nothing — so the message is the whole of
 * what gets read, and it is what a caller pins.
 *
 * This is the SECOND place the cap is applied, and it is not the
 * re-check of an already-capped batch it reads as. Each of the
 * dispatcher's two claims carries a SQL `LIMIT` over this setting, one
 * over `topics` and one over `export_subscriptions`, and the two are
 * separate branches merged before their rows reach here — so the
 * `LIMIT` bounds a branch and this call bounds the tick. A pass finding
 * both tables backlogged hands this function twice the cap and gets the
 * cap back, and what it drops was CLAIMED: its `next_run_at` moved
 * before anything looked at it, so it waits a whole interval rather
 * than being taken by the tick after this one. The call is inert only
 * where the two branches together come in under the cap. It would still
 * be worth making if it never were anything else: a `LIMIT` reads as a
 * paging knob, and whoever next tunes that query — adding a filter,
 * changing the ordering, folding in a join — is looking at a
 * performance detail rather than at the only thing standing between one
 * pass and the whole backlog. It is one edit from being gone, and
 * nothing about that edit looks like a spending decision.
 * `ENV_DEFAULTS.AR_DISPATCH_BATCH_CAP` in `scripts/workflow-markers.ts`
 * carries the other half of that argument: what the surviving copy
 * still bounds, and what it cannot get back.
 *
 * The system this ports from bounded such a pass nowhere, and what
 * that cost is the reason this function is here rather than a
 * comment on the query. A workflow holding its own schedule trigger
 * read every pending row a pass found and put each one through model
 * chains unconditionally — no cap on the batch, no gate in front of
 * the calls — so what a tick spent was settled by however many rows
 * happened to be sitting there, at a call per row and then one per
 * chain over it. What was sitting there was a test fixture a smoke
 * script had staged into the live input folder and never swept, so
 * every tick found the same rows again. It ran unattended in a
 * container nobody remembered was up, spent a month's model budget
 * in about forty minutes, and recorded each of those runs as a
 * success; the first anybody heard of it was a billing warning from
 * the provider. `docs/architecture/01-invariants.md` draws four
 * separate spending properties out of that failure, and this
 * function stands behind one of them: a run without an explicit
 * ceiling scales with its input, so one pass over an unusually large
 * batch makes as many calls as it found rows.
 *
 * What a short answer from here does NOT say is that the claim was
 * bounded. This function is handed a list, never the statement that
 * produced it, so a `LIMIT` that held and a `LIMIT` removed on a
 * tick with little due look identical from inside it — a pass coming
 * back under the cap is evidence about the backlog and about nothing
 * else. The call earns its line on the day those two part company,
 * which is the day nobody is looking.
 *
 * @param items - The batch to bound, in the order it should be taken.
 * @param cap - The most items one pass may carry.
 * @returns A new array holding the first `cap` items at most.
 * @throws {Error} When `cap` is not a positive integer.
 */
export function capBatch<T>(items: readonly T[], cap: number): T[] {
  if (!Number.isInteger(cap) || cap <= 0) {
    throw new Error(
      `[schedule] batch cap must be a positive integer, not ${cap}. ` +
      'Either AR_DISPATCH_BATCH_CAP holds a value that is not one, ' +
      'or the text it resolved to reached here without being parsed ' +
      'into a number.',
    );
  }

  return items.slice(0, cap);
}
