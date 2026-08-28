/**
 * @packageDocumentation
 * This week's model spend — the one figure the sidebar carries under
 * the nav, and the second fixture in this directory standing in for
 * something schema v2 does not store.
 *
 * `./types.ts` says it on {@link SpendSummary}: this MIRRORS NO
 * TABLE. The used half is an aggregate — `llm_calls` in
 * `packages/service/src/db/schema/runs.ts` records one row per model
 * call with its `est_tokens` and `called_at`, and this is those
 * summed over the current week. The limit half is stored nowhere at
 * all. Nothing in schema v2 enforces a spend ceiling, so the fixture
 * supplies one, and the pill above the bar is a READING of the sum
 * against that ceiling rather than a flag any pipeline sets. Which is
 * why {@link classifySpend} exists and why {@link WEEK_SPEND} derives
 * its status through it instead of carrying one written by hand.
 *
 * NOT domain-scoped, which makes {@link getSpendSummary} the third
 * accessor `./api.ts` cannot hold to its "rejects an unknown domain
 * slug" rule — after `listConnectors` in `./connectors.ts` and
 * `getSettings` in `./settings.ts`. Three reasons, in the order they
 * settle it:
 *
 * - The UI spec re-points this widget at `GET /spend/summary`, a path
 *   with no domain segment in it.
 * - A model call reaches a domain only through `runs.domain_id`, and
 *   both that column and `llm_calls.run_id` are nullable — a
 *   maintenance or backfill pass belongs to no domain, and the
 *   schema's own docblock says so. So per-domain sums would drop
 *   work the deployment paid for, and would not add up to what it
 *   spent.
 * - The ceiling is a deployment's budget. A per-domain one would be
 *   an invention on top of an invention, with nothing to derive the
 *   split from.
 *
 * The shell-visible consequence is that switching domain leaves this
 * figure exactly where it was, alongside the tools surface's
 * connector cards and the whole settings surface. That is the correct
 * reading of a budget that spans domains, not a switcher that missed
 * a subscriber.
 *
 * There is ONE summary object, so the near-miss pair the other
 * fixture modules carry in their data — a source flagged without a
 * streak beside one failing without a flag, a notification channel
 * off among two on — has nowhere to live here. The fixture reads
 * healthy, which is the ordinary state and the one a demo should
 * open on; the unhealthy pill is reachable only by raising
 * {@link WEEK_SPEND}'s spend, and the derivation above is precisely
 * what makes that one-number edit enough. Both readings are pinned
 * in `./spend.test.ts` instead, over spends built for the purpose.
 *
 * Frozen for the reason `./settings.ts` gives: one shared object, no
 * accessor copying it, and `readonly` is a compile-time claim a cast
 * drops. Unlike that module the freeze is shallow AND complete, since
 * every member here is a primitive — there is no nested payload for a
 * second freeze to reach.
 */

import type { SpendSummary } from './types';

/**
 * The two readings the sidebar pill can carry.
 *
 * Reached through {@link SpendSummary} rather than by importing
 * `SidebarWeekSummaryProps` a second time: `./types.ts` already pins
 * the member to the component's own union, so aliasing that member
 * keeps this module one hop from the same source of truth instead of
 * holding a second, independent pin on `@ar/ui` that could drift from
 * the first.
 *
 * What the alias catches and what it does not, worth knowing before
 * trusting it: a member RENAMED or REMOVED in the component reddens
 * `check-types` here, because {@link classifySpend} returns literals
 * the union would no longer admit. A member ADDED does not — a
 * function returning a subset of a union type-checks fine. So a third
 * tone in `SidebarWeekSummary` arrives as a reading this module
 * silently never produces, and the classifier below is the one place
 * that would have to learn it.
 */
export type SpendStatus = SpendSummary['status'];

/**
 * The share of the week's ceiling at which the pill turns.
 *
 * A fixture-layer choice, like the ceiling itself: nothing in schema
 * v2 stores a threshold any more than it stores a limit. Four fifths
 * so the pill turns BEFORE the budget is gone rather than as it goes
 * — a warning that arrives at the ceiling reports a thing nobody can
 * still act on, and this widget is a glance rather than a report.
 *
 * Exported because it is what the pill MEANS. A surface explaining
 * the reading, or the settings control that will eventually own the
 * ceiling, needs this number rather than a second copy of it; and
 * `./spend.test.ts` builds its boundary cases from it, so the cases
 * hold the relation while one test holds the value.
 */
export const UNHEALTHY_FRACTION = 0.8;

/**
 * The week's ceiling, in tokens.
 *
 * Round, because a ceiling is chosen rather than counted — the
 * contrast with the sum below is the point, and a round "used"
 * against a round "limit" would read as two settings rather than as
 * a measurement against a budget.
 */
const WEEKLY_TOKEN_LIMIT = 2_000_000;

/**
 * What this week's calls have summed to so far.
 *
 * Deliberately not round: it is a sum over many `est_tokens`, and a
 * figure ending in three zeros would look like a second setting.
 *
 * Just over half the ceiling, which is the reading a partial week
 * wants. `FIXTURE_NOW` in `./types.ts` is a Thursday at 14:30 UTC —
 * 3.6 of the week's 7 days — so a little past half is a deployment
 * spending on pace, where a figure near the ceiling on a Thursday
 * would be telling a story the fixture never meant to tell. It also
 * keeps the `Progress` bar visibly part-filled: at 0 or at 100
 * percent the bar renders the same as one whose value never bound.
 */
const TOKENS_USED_THIS_WEEK = 1_042_800;

/**
 * How the sidebar reads a week's spend.
 *
 * Takes the pair as an object rather than as two positional numbers.
 * `used` and `limit` are the same type, so a call site that swapped
 * them would compile, run, and report a deployment at half its budget
 * as one at twice it.
 *
 * Typed as a `Pick` of {@link SpendSummary} so a member renamed in
 * the fixture type reddens here, and so a caller holding a whole
 * summary — a page re-reading the pill after an edit, say — can pass
 * it straight in.
 *
 * The non-positive ceiling is handled first, and what it is really
 * for is a NEGATIVE one: a negative limit divides to a negative
 * share, which reads as comfortably healthy while a deployment
 * spends against a budget that makes no sense. At exactly zero the
 * ratio happens to agree with the guard — `1 / 0` is `Infinity` and
 * lands above the threshold, `0 / 0` is `NaN` and every comparison
 * against it is false — but two arithmetic curiosities agreeing with
 * the intended answer is not the same as stating it, and a later
 * edit should not have to know about either. A ceiling of nothing is
 * not a ceiling anything can be under, so any use of it reads
 * unhealthy and no use reads healthy, said once and in one place.
 *
 * The threshold is inclusive, and that is the only decision the two
 * comparisons disagree about: a spend landing exactly on the line is
 * at the share the pill exists to announce, so handing the line
 * itself to the healthy side would announce it one token late.
 *
 * Where this reading lives after q15 is q15's call. `SpendSummary`
 * carries `status` because `GET /spend/summary` is expected to answer
 * it, and the day the ceiling becomes a stored value the reading has
 * to move to whoever stores it — an app deriving a pill from a
 * budget it cannot see is the same shape as this fixture, just
 * further from the data.
 *
 * @param spend - The week's usage and its ceiling.
 * @returns Its reading. Total: every pair of numbers has exactly one,
 * including the pairs no budget makes sense of.
 */
export function classifySpend(
  spend: Pick<SpendSummary, 'used' | 'limit'>,
): SpendStatus {
  if (spend.limit <= 0) {
    if (spend.used > 0) {
      return 'unhealthy';
    }

    return 'healthy';
  }

  if (spend.used / spend.limit >= UNHEALTHY_FRACTION) {
    return 'unhealthy';
  }

  return 'healthy';
}

/**
 * This week's model spend, as the sidebar reports it.
 *
 * `status` is computed from the two numbers beside it rather than
 * written, so the fixture cannot come to disagree with itself: an
 * edit raising the spend past the threshold moves the pill and the
 * bar together, which is the whole reason a reader can trust either.
 *
 * Frozen, per the module docblock.
 */
export const WEEK_SPEND: SpendSummary = Object.freeze({
  status: classifySpend({
    used: TOKENS_USED_THIS_WEEK,
    limit: WEEKLY_TOKEN_LIMIT,
  }),
  used: TOKENS_USED_THIS_WEEK,
  limit: WEEKLY_TOKEN_LIMIT,
  // `llm_calls.est_tokens` is what the aggregate sums, so tokens is
  // what it counts. Spelled out although `SidebarWeekSummary`
  // defaults this member, for the reason `./types.ts` gives: a
  // summary of an unnamed quantity is not a thing the fixture layer
  // should be able to express.
  unit: 'tokens',
});

/**
 * This week's spend summary.
 *
 * Takes no domain argument, and that is a decision rather than an
 * omission — the module docblock says what it means for `./api.ts`
 * and for the domain switcher.
 *
 * Hands back the shared frozen object rather than a copy, exactly as
 * `getSettings` does: a copy would be a fresh UNFROZEN one, which is
 * the object a caller can write in place and believe the write took.
 *
 * @returns The spend fixture. Always the same object.
 */
export function getSpendSummary(): SpendSummary {
  return WEEK_SPEND;
}
