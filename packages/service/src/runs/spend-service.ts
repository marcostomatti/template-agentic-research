/**
 * @packageDocumentation
 * The spend surface's ONE READ: what the model ledger holds, taken
 * apart per domain and per UTC day over a window this module bounds.
 *
 * ONE FUNCTION AND NO WRITE, which is why this is a module of its
 * own rather than a third export of `./service.ts`. That file
 * narrows `RunStore` to the five methods the two runs reads reach
 * and states {@link summariseSpend} as the one it deliberately
 * leaves out; this one narrows the same port to that method and
 * reaches none of the other five. Neither file can page the ledger
 * through the other's half by accident or by a later edit, because
 * neither type has a member for it — and `RunStore` declares no
 * insert, update or delete at all, so there is nothing here that
 * could write a `runs` or an `llm_calls` row whatever it wanted to.
 * `tests/invariants/api-read-first.test.ts` derives that from
 * `keyof` over the port rather than from this paragraph.
 *
 * NO MEMBER OF WHAT THIS ANSWERS IS CURRENCY, AND THAT IS A FACT
 * ABOUT THE TABLE RATHER THAN A DISCIPLINE KEPT HERE. `llm_calls`
 * carries `node`, `model`, `prompt_chars`, `est_tokens` and
 * `called_at`, and no price, rate, amount or currency column at
 * all, so there is nothing behind a cost for a summary over it to
 * answer. {@link SpendBucket} is a count and two magnitudes, and
 * `est_tokens`' own TSDoc in `src/db/schema/runs.ts` says the
 * second of those is arithmetic over the first rather than a
 * provider's report — so a total over either does not reconcile
 * with a bill. This is the group whose NAME pulls the other way,
 * which is why `docs/architecture/08-http-api.md` argues it before
 * the route exists and why `./spend-service.test.ts` holds the
 * answered member roster against a roster of money words rather
 * than trusting a reviewer to notice.
 *
 * THE WINDOW IS ALWAYS CLOSED BY THE TIME THE STORE SEES IT, and
 * {@link SpendWindow} is that claim written as a type rather than
 * as a promise. `RunStore.summariseSpend` accepts a `TimeWindow`
 * whose bounds may each be null, because that is what the shared
 * shape admits; no request reaching it through here is unbounded on
 * either side. Three spellings arrive and all three leave with two
 * bounds: neither sent defaults to the last
 * {@link SPEND_DEFAULT_WINDOW_DAYS} days, an `until` alone closes
 * below it by the same span, and a `since` alone closes at the
 * clock. So an unbounded scan of the ledger is unreachable from the
 * wire, which is what `src/runs/store.ts` says it depends on this
 * module for.
 *
 * THE SPAN IS BOUNDED TOO, AND THE BOUND IS REFUSED RATHER THAN
 * CLAMPED. A window wider than {@link SPEND_MAX_WINDOW_DAYS} is a
 * `422` naming the parameter and the maximum, raised before any
 * store is asked anything — the same decision `perPage` above 200
 * is refused by, taken on the axis this route actually windows.
 * Clamping it would answer a narrower window than the request named
 * with no member of the answer saying so, which is the argument
 * `docs/architecture/08-http-api.md` already loses for a page.
 *
 * THE RESOLVED WINDOW TRAVELS BACK BESIDE THE BUCKETS, for
 * `RunDetail.ledgerTruncated`'s reason one route over: a caller
 * cannot compare what it got against a constant it was never told.
 * A request that sent no bounds is answered over a span this module
 * chose, and {@link SpendSummary.window} is how the caller learns
 * which one — in the `sinceInclusive`/`untilExclusive` spelling,
 * so which side each bound closes is on the wire rather than in a
 * document.
 *
 * A `since` IN THE FUTURE WITH NO `until` IS AN EMPTY SUMMARY AND
 * NOT A REFUSAL. The clock closes such a window below its own lower
 * bound, and under half-open semantics nothing can fall inside it,
 * so the answer is an empty bucket list — which is the truthful
 * answer to a request for the calls made since an instant that has
 * not arrived. It is not refused because the rule would depend on
 * the clock rather than on the request, and a schema cannot hold it
 * at all: `docs/architecture/08-http-api.md` records that an empty
 * window is a legitimate request answering an empty result.
 *
 * THE DAY BUCKET IS THE STORE'S AND IT IS UTC. Nothing here
 * truncates, re-buckets or re-orders anything: `SpendBucket.day` is
 * the instant that opens a UTC day, the order is `day` descending
 * then `domainId` ascending with the null bucket last, and both are
 * `RunStore.summariseSpend`'s contract. A service re-bucketing a
 * summary it was handed would be a second calendar for the one
 * question where a default calendar is a silent per-deployment
 * difference in every number a widget shows.
 *
 * THE CLOCK IS A PARAMETER, on the terms `runTopicNow` in
 * `src/topics/service.ts` takes one: the default window is the only
 * thing here that depends on when the request arrived, and a
 * module reading `new Date()` inside itself would put that instant
 * out of reach of every case in `./spend-service.test.ts`.
 *
 * THE DOMAIN ARRIVES AS A QUERY PARAMETER, NARROWS, AND IS
 * RESOLVED BEFORE THE LEDGER IS TOUCHED. `/spend/summary` is
 * deployment-wide exactly as `/runs` is, so `?domain=<slug>` narrows
 * an answer that exists without it, and this module does the
 * resolving because `RunFilter.domainId` is an id and only
 * `DomainStore.findDomainBySlug` makes one. The lookup is awaited
 * on its own: `RunStore.summariseSpend` answers an empty list for
 * an id no domain carries, correctly, so a summary read first would
 * aggregate the whole ledger before answering `404` about a domain
 * that is not there.
 *
 * AN ABSENT `?domain` IS EVERY CALL, INCLUDING THE ONES THAT BELONG
 * TO NOBODY, and there is no spelling that answers those alone.
 * `runs.domain_id` is nullable and `llm_calls.run_id` is too, so a
 * call may reach no domain by two routes; both land in the bucket
 * whose `domainId` is null, and the buckets' `calls` therefore add
 * up to the number of calls the window holds. Narrowing excludes
 * both kinds, correctly — neither is that domain's — so the
 * per-domain summaries do NOT sum to the unnarrowed one, and the
 * difference is the unattributed spend rather than a rounding of
 * it.
 *
 * NEITHER REFUSAL QUOTES ANYTHING. The two sentences below are
 * constants of this module's own, the span refusal names the
 * MAXIMUM rather than the span submitted, and no value a caller
 * sent is composed into either. `./spend-service.test.ts` counts a
 * planted sentinel in each CHANNEL of each refusal against a
 * planted refusal that leaks through all three.
 *
 * THE STORE IS A PARAMETER, so every rule here is exercisable with
 * no database: `tests/helpers/memory-research-store.ts` plants the
 * `runs` and `llm_calls` rows behind the one read, no port writing
 * either.
 */
import type { RunFilter, RunStore, SpendBucket } from './store.js';
import type { DomainStore } from '../domains/store.js';
import type { TimeWindow } from '../http/schemas.js';

import { z } from 'zod';

import {
  NotFoundError,
  ValidationError,
} from '../../lib/errors/index.js';
import {
  slugParamSchema,
  timeWindowQuerySchema,
} from '../http/schemas.js';

/**
 * Exactly the port methods {@link summariseSpend} reaches, across
 * both ports it reaches them on.
 *
 * A `Pick` OF TWO PORTS RATHER THAN EITHER ONE WHOLE, on the terms
 * `RunsServiceStore` in `./service.ts` states. Resolving a slug is
 * one method of `DomainStore`, and asking for that port whole would
 * have this module claim to need the domain writes it never issues.
 *
 * FIVE OF `RunStore`'S SIX METHODS ARE ABSENT, and the absence is
 * the split between this module and its sibling written as a type.
 * The page and the single get belong to `./service.ts`, the
 * aggregate belongs here, and no method is named by both — which
 * is one more separation than the findings pair manages, whose two
 * modules share the lookup each resolves its address with.
 *
 * Built with `Pick` rather than by listing signatures, so a method
 * here cannot drift from the thing it names: a hand-copied
 * signature would go on type-checking against a port that had
 * moved under it.
 */
export type SpendServiceStore =
  Pick<DomainStore, 'findDomainBySlug'>
  & Pick<RunStore, 'summariseSpend'>;

/**
 * How many days back a request that named no bounds is answered
 * over.
 *
 * A DEFAULT AND NOT A FLOOR. A caller naming its own window gets
 * that window, up to {@link SPEND_MAX_WINDOW_DAYS}; this is what an
 * unqualified `GET /spend/summary` means, and a month is the span
 * the question is usually asked over — enough of the ledger to
 * compare this week against the last three, and small enough that
 * the ordinary request is not the widest one the route allows.
 *
 * A DAY HERE IS 86,400,000 MILLISECONDS AND NOT A CALENDAR DAY.
 * Both bounds are absolute instants over a `timestamptz` column, so
 * the span is arithmetic on instants and no zone, offset or
 * transition enters it. That is a different thing from
 * `SpendBucket.day`, which IS a calendar day and is truncated at
 * UTC by the store; a span counted in calendar days would be the
 * second calendar this surface exists to avoid.
 *
 * EXPORTED SO ITS OWN CASES CAN DERIVE FROM IT. A test
 * transcribing the number would stay green against a default that
 * had moved, which is the one change to this constant worth
 * reporting.
 */
export const SPEND_DEFAULT_WINDOW_DAYS = 30;

/**
 * The widest span a request may name, in days.
 *
 * A CEILING ON THE ONE AXIS THIS ROUTE WINDOWS, and the reason it
 * exists is that `/spend/summary` reads no page at all. Every other
 * collection on this surface is bounded by `perPage`; a summary is
 * bounded by the SPAN it aggregates over, one bucket per domain per
 * day, so the size of the answer is a function of this number and
 * of how many domains the deployment runs rather than of how much
 * the ledger holds. A quarter is the widest span that keeps the
 * unpaginated body in the same order of magnitude as a page a
 * paginated route would answer.
 *
 * REFUSED AND NOT CLAMPED, per this module's header, and refused
 * before any store call — so no request can ask for an unbounded
 * scan of `llm_calls`, and one that tries costs `domains` and the
 * ledger nothing.
 *
 * A YEAR IS STILL ASKABLE, IN FOUR REQUESTS. The window is
 * half-open, so four adjacent quarters partition a year rather
 * than overlapping on the seams — which is what
 * `src/http/schemas.ts` argues the half-open bounds are for.
 *
 * EXPORTED ON {@link SPEND_DEFAULT_WINDOW_DAYS}'s terms: the
 * bracketing case derives its refused window from this number, so a
 * ceiling that moved moves the fixture with it.
 */
export const SPEND_MAX_WINDOW_DAYS = 92;

/**
 * How long a day is, in milliseconds.
 *
 * The unit both spans above are counted in, spelled once. Named
 * rather than written out at each use, because `86_400_000`
 * appearing twice beside a multiplication is the arithmetic a
 * reader has to check rather than read.
 */
const MILLISECONDS_PER_DAY = 86_400_000;

/** {@link SPEND_DEFAULT_WINDOW_DAYS} in milliseconds. */
const DEFAULT_SPAN_MS
  = SPEND_DEFAULT_WINDOW_DAYS * MILLISECONDS_PER_DAY;

/** {@link SPEND_MAX_WINDOW_DAYS} in milliseconds. */
const MAX_SPAN_MS = SPEND_MAX_WINDOW_DAYS * MILLISECONDS_PER_DAY;

/**
 * The whole query `GET /spend/summary` reads: a window over time,
 * and one optional narrowing.
 *
 * COMPOSED FROM THE TWO SHARED DECLARATIONS RATHER THAN RESPELT, so
 * the ISO-8601 stamp format, the half-open bounds, the ordering
 * refusal and what a slug may look like are all inherited and none
 * of them is stated twice.
 *
 * THE COMPOSITION HAS A DIRECTION AND IT IS NOT THE ONE THAT READS
 * NATURALLY. `since` before `until` is a check on the window
 * OBJECT, and measured against the zod in this tree, `.extend()`
 * carries such a check OUTWARDS and never inwards: extending FROM
 * `timeWindowQuerySchema` keeps it and extending INTO it drops it,
 * silently, while both spellings type-check and answer every other
 * request identically. So this chain opens with the window schema.
 *
 * NO PAGE AT ALL, which is what puts this route in the small
 * unpaginated class `GET /domains/:slug/categories` opened — and
 * the two are unpaginated for different reasons worth not reading
 * as one convention. A taxonomy is small by construction; a summary
 * is bounded by {@link SPEND_MAX_WINDOW_DAYS}, which is why that
 * ceiling exists at all. So `?page` and `?perPage` are undeclared
 * here, and being undeclared on a `.strict()` shape they are a
 * `422` naming `query` rather than parameters quietly ignored.
 *
 * STRICT, which it inherits rather than re-declares.
 * `timeWindowQuerySchema` is `.strict()` and `.extend()` keeps the
 * catchall, so `?domian=radar` is refused rather than read as a
 * request for every domain's spend — which is the difference
 * between a caller being told its narrowing was ignored and a
 * caller reading the whole deployment's ledger as the answer to it.
 *
 * `domain` IS HELD TO {@link slugParamSchema}, THE SAME SHAPE A
 * PATH SEGMENT IS, on the terms `runListQuerySchema` in
 * `./service.ts` states: a slug is a slug wherever it is met. So a
 * value that could not be a slug is a `422` naming the parameter,
 * raised before any store call, rather than a `404` raised after
 * one.
 *
 * NOTHING HERE BOUNDS THE SPAN, and that is the one rule of this
 * boundary that lives in a function instead. The span depends on
 * the CLOCK whenever a bound was left open, and a schema has no
 * clock — so {@link resolveWindow} holds it, and holds it once
 * rather than in a schema for the closed case and a function for
 * the open ones.
 */
export const spendQuerySchema = timeWindowQuerySchema.extend({
  domain: slugParamSchema.optional(),
});

/**
 * A parsed spend query: every member present only when it was sent,
 * none of the three carrying a default.
 *
 * The defaulting is {@link resolveWindow}'s and happens after the
 * parse, because two of the three defaults are read off the clock.
 */
export type SpendQuery = z.infer<typeof spendQuerySchema>;

/**
 * The window a summary was actually taken over: half-open, and
 * closed on BOTH sides.
 *
 * `TimeWindow` NARROWED RATHER THAN RESTATED, which is what makes
 * this an assertion instead of a second shape. The shared type
 * admits a null on either bound because an unbounded read is a
 * thing a store can be asked for; a window that reached
 * {@link summariseSpend} is not one, per this module's header, and
 * the two members below say so in the only place a reader will
 * look.
 *
 * IT IS ALSO WHAT TRAVELS BACK. {@link SpendSummary.window} is this
 * shape rather than the wire's `since`/`until` pair, so a caller
 * reading a defaulted window learns which side each bound closes
 * from the member names — the same reason `src/http/schemas.ts`
 * gives for renaming them on the way into a store.
 */
export interface SpendWindow extends TimeWindow {
  /** The lower bound. A call stamped exactly here is IN. */
  readonly sinceInclusive: Date;

  /** The upper bound. A call stamped exactly here is OUT. */
  readonly untilExclusive: Date;
}

/**
 * What `GET /spend/summary` answers: the window it was read over,
 * and one bucket per domain per UTC day within it.
 *
 * TWO MEMBERS RATHER THAN A BARE LIST, because the window may not
 * be the one the caller named. A request that sent no bounds is
 * answered over a span this module chose, and a list on its own
 * would leave a reader to infer which one from the days that
 * happen to carry calls — which says nothing at all about a
 * window in which nothing was called.
 *
 * NEITHER MEMBER IS CURRENCY AND NEITHER IS A TOTAL. There is no
 * sum across buckets here: a consumer adding them up is doing
 * arithmetic over a count and two magnitudes it can see, rather
 * than reading a number this module composed out of them.
 * `./spend-service.test.ts` holds the whole answered member roster
 * against a roster of money words.
 */
export interface SpendSummary {
  /**
   * The span the buckets below were taken over, as resolved.
   *
   * EQUAL TO WHAT THE STORE WAS HANDED, not to what the caller
   * sent: the two differ exactly when a bound was defaulted, and
   * that difference is the whole reason this member exists.
   */
  readonly window: SpendWindow;

  /**
   * What each domain spent on each UTC day inside that window.
   *
   * A BUCKET EXISTS BECAUSE CALLS LANDED IN IT, per
   * {@link SpendBucket}: there is no row for a day nothing was
   * called on and none for a domain that made no calls, so a
   * consumer filling a chart supplies its own zeroes for the gaps.
   * An empty list is an ordinary answer — a window in which
   * nothing was called, a domain that called nothing, and a slug
   * that resolved to a domain with no passes are all this.
   *
   * The order is the store's, per `RunStore.summariseSpend`, and
   * nothing here re-sorts.
   */
  readonly buckets: readonly SpendBucket[];
}

/**
 * What a caller is told when no domain carries the slug it named in
 * `?domain`.
 *
 * The slug is not in it, per this module's header, and it is the
 * same sentence `./service.ts` answers for its own `?domain` —
 * spelled again rather than imported, because the two are equal by
 * intent rather than by derivation and either is free to change
 * without dragging the other with it.
 */
const NO_SUCH_DOMAIN = 'No domain carries that slug';

/** The message the span refusal carries at the top. */
const VALIDATION_FAILED = 'Validation failed';

/**
 * The parameter an over-wide span is refused against.
 *
 * ONE FIELD RATHER THAN BOTH, and `since` rather than `until`, on
 * the terms `src/http/schemas.ts` picks for the ordering refusal:
 * two details would say the same thing twice about one pair, and a
 * caller narrowing a window it was told is too wide moves the lower
 * bound.
 */
const SPAN_FIELD = 'since';

/**
 * What a caller is told when the window it named is too wide.
 *
 * IT NAMES THE MAXIMUM AND NOT THE SPAN SUBMITTED, which is the
 * verdict ladder's rule in `src/findings/verdict-service.ts` one
 * group over: a caller learns what it may ask for rather than being
 * told back what it asked. {@link SPEND_MAX_WINDOW_DAYS} is a
 * constant of this module, so composing it in leaks nothing.
 */
const SPAN_TOO_WIDE
  = `The window may not span more than ${SPEND_MAX_WINDOW_DAYS} days`;

/** The machine-readable half of that refusal. */
const SPAN_TOO_WIDE_CODE = 'window_too_wide';

/**
 * Closes whatever bounds the caller sent and holds the result to
 * {@link SPEND_MAX_WINDOW_DAYS}.
 *
 * @param now - The clock, read at most once and only when the
 *   caller left the upper bound open.
 * @param query - The parsed query. The schema has already
 *   established that a `since` sent beside an `until` is strictly
 *   before it, so there is no ordering guard here.
 * @returns The half-open span, closed on both sides.
 * @throws ValidationError - When the resolved span is wider than
 *   {@link SPEND_MAX_WINDOW_DAYS}. One detail naming
 *   {@link SPAN_FIELD} and the maximum, and nothing submitted in
 *   any of its three channels.
 *
 * @remarks
 * THE UPPER BOUND IS RESOLVED FIRST AND THE LOWER ONE HANGS OFF IT,
 * which is what makes three spellings one rule rather than three
 * branches. An absent `until` is the clock; an absent `since` is
 * {@link SPEND_DEFAULT_WINDOW_DAYS} before whatever the upper bound
 * came to. So a request naming neither gets the last thirty days,
 * a request naming `until` alone gets the thirty days before it,
 * and a request naming `since` alone gets everything since —
 * bounded above by the clock, which is what stops it being a scan
 * of the whole ledger.
 *
 * THE CLOCK IS READ AT MOST ONCE, and never twice. Two reads could
 * differ, and the second would be the one the caller is told about
 * while the first is the one the ledger was aggregated over.
 *
 * THE COMPARISON IS STRICTLY GREATER, so a span of exactly the
 * maximum is accepted: the ceiling is the widest window a caller
 * may name rather than the first one refused. `>=` would refuse the
 * request the constant is documented as allowing.
 *
 * A SPAN CAN COME OUT NEGATIVE AND IS NOT REFUSED FOR IT. A `since`
 * in the future with no `until` closes above at the clock, below
 * its own lower bound; nothing can fall inside such a window, so it
 * answers emptily. This module's header carries why that is the
 * truthful answer rather than a refusal, and the schema's ordering
 * check is what makes it unreachable whenever both bounds were
 * sent.
 */
function resolveWindow(
  now: () => Date,
  query: SpendQuery,
): SpendWindow {
  const untilExclusive = query.until ?? now();
  const sinceInclusive = query.since
    ?? new Date(untilExclusive.getTime() - DEFAULT_SPAN_MS);
  const span = untilExclusive.getTime() - sinceInclusive.getTime();

  if (span > MAX_SPAN_MS) {
    throw new ValidationError(VALIDATION_FAILED, [{
      field: SPAN_FIELD,
      message: SPAN_TOO_WIDE,
      code: SPAN_TOO_WIDE_CODE,
    }]);
  }

  return { sinceInclusive, untilExclusive };
}

/**
 * Turns an optional `?domain` into what `RunStore` narrows on.
 *
 * @param store - Where the domain is read.
 * @param domain - The slug the caller sent, already narrowed by
 *   {@link slugParamSchema} at whichever boundary the request
 *   entered, or `undefined` when it sent none.
 * @returns The empty filter for every call in the window, or one
 *   naming the domain's id.
 * @throws NotFoundError - When a slug was sent and no domain
 *   carries it.
 *
 * @remarks
 * AN ABSENT SLUG COSTS NO READ AT ALL, which is what makes widening
 * the cheap answer as well as the default one.
 *
 * Private, and spelled again rather than shared with the identical
 * helper in `./service.ts`, on the terms {@link NO_SUCH_DOMAIN}
 * gives: a shared one would put one route's wording on another's
 * refusals.
 */
async function spendFilterFor(
  store: SpendServiceStore,
  domain: string | undefined,
): Promise<RunFilter> {
  if (domain === undefined) {
    return {};
  }

  const row = await store.findDomainBySlug(domain);

  if (row === null) {
    throw new NotFoundError(NO_SUCH_DOMAIN);
  }

  return { domainId: row.id };
}

/**
 * Aggregates the model ledger over one window into a count and two
 * magnitudes per domain per UTC day.
 *
 * @param store - Where the domain and the ledger are read.
 * @param now - The clock the default window is measured back from.
 * @param query - The parsed query, as {@link spendQuerySchema}
 *   answered it.
 * @returns The window the read was taken over and the buckets
 *   inside it.
 * @throws ValidationError - When the resolved span is wider than
 *   {@link SPEND_MAX_WINDOW_DAYS}.
 * @throws NotFoundError - When a `?domain` was sent and no domain
 *   carries it. The only two refusals this function has: a window
 *   in which nothing was called, a domain that has spent nothing
 *   and a deployment that has called nothing are each an empty
 *   bucket list.
 *
 * @remarks
 * THE WINDOW IS RESOLVED FIRST, AND IT IS THE ONE STEP THAT ASKS
 * NOBODY ANYTHING. A span above the maximum is a fault in the
 * request itself rather than a fact about the deployment, so it is
 * refused before `domains` is read and before the ledger is
 * touched. A request that gets both wrong — an over-wide window
 * under a slug no domain carries — is answered about the window,
 * which is the half the caller can fix without knowing anything
 * about this deployment.
 *
 * THE SLUG IS RESOLVED SECOND AND ON ITS OWN, which is the whole
 * difference between a domain that has spent nothing and a domain
 * that is not there: `RunStore.summariseSpend` answers an empty
 * list for an id no domain carries, correctly, so the two states
 * are one answer from its side. Folding the lookup into the
 * aggregate would have a mistyped slug scan a quarter of the ledger
 * before the `404`.
 *
 * THE AGGREGATE IS ONE READ AND THERE IS NOTHING TO ISSUE BESIDE
 * IT. Every list on this surface pairs its page with a count; a
 * summary has no window over itself to report the size of, the
 * bound being the span rather than a row limit, so there is no
 * second read here and no `meta` for a router to build out of one.
 *
 * THE WINDOW ANSWERED IS THE OBJECT THAT WAS HANDED TO THE STORE
 * and not a second derivation of it, so the two cannot come to
 * disagree about which span the buckets belong to.
 */
export async function summariseSpend(
  store: SpendServiceStore,
  now: () => Date,
  query: SpendQuery,
): Promise<SpendSummary> {
  const window = resolveWindow(now, query);
  const filter = await spendFilterFor(store, query.domain);
  const buckets = await store.summariseSpend(filter, window);

  return { window, buckets };
}
