/**
 * @packageDocumentation
 * The runs surface's two reads: one window of the passes the service
 * has made, and one pass with the head of its ledger beside it.
 *
 * TWO FUNCTIONS AND NO WRITE, which is the read-first law of
 * `docs/architecture/08-http-api.md` arriving here as a shape rather
 * than as an observance. `src/runs/store.ts` declares six methods,
 * all six reads, and there is no seventh — no insert, no update, no
 * delete, and no escape hatch to reach `runs` or `llm_calls` through
 * some other way — so nothing in this file can open a pass or append
 * a ledger row, by mistake or by a later edit, because there is
 * nothing to call. `tests/invariants/api-read-first.test.ts` derives
 * that from `keyof` over the port types rather than from this
 * paragraph.
 *
 * THE DOMAIN ARRIVES AS A QUERY PARAMETER AND NOT AS A PATH SEGMENT,
 * which is the one place this module departs from every list beside
 * it. `/runs` is deployment-wide: a pass belongs to a domain or to
 * none, and the collection is the whole of what the service has
 * done, so `?domain=<slug>` NARROWS a page that exists without it
 * rather than naming the collection being read.
 * `GET /domains/:slug/findings` and `GET /domains/:slug/documents`
 * cannot be met outside a domain at all, and say so in their paths.
 *
 * SO THIS MODULE BUILDS THE FILTER AND THE ROUTER DOES NOT, which is
 * the other half of the same departure. `RunFilter.domainId` is an
 * ID, and the only thing that turns a slug into one is
 * `DomainStore.findDomainBySlug` — a store call, which a router has
 * nowhere to make. So `./routes.ts` forwards the `domain` its parsed
 * query carries and {@link listRuns} does the resolving, where the
 * sibling lists are handed a value object their routers rebuilt
 * member by member.
 *
 * THE SLUG IS RESOLVED BEFORE ANY RUN IS READ, and that read is the
 * entire difference between a domain that has run nothing and a
 * domain that is not there. `RunStore` answers an empty page and a
 * count of `0` for an id no domain carries, both correctly — nothing
 * points at a row that is not there — so the two run reads alone
 * could not tell the two states apart, and a mistyped slug would
 * read as a deployment that had never dispatched for it. The lookup
 * is awaited on its own rather than folded into the pair below,
 * which is the one place this module deliberately pays a round trip:
 * a 404 that had already issued two reads over `runs` would be
 * scanning every pass the service has made to answer about a domain
 * that does not exist.
 *
 * AN ABSENT `?domain` IS EVERY RUN, INCLUDING THE DOMAIN-LESS TICKS,
 * and there is no spelling that answers those ticks alone.
 * `runs.domain_id` is nullable because a maintenance or cross-domain
 * pass belongs to nobody, and `RunFilter.domainId` is an optional
 * `number` rather than a `number | null`, so there is no value a
 * caller could send to mean the rows belonging to no domain — and
 * {@link runListQuerySchema} is `.strict()`, so the parameter that
 * would carry such a value is refused rather than merely unread.
 * That is this wave's decision recorded rather than an omission for
 * a later reader to find.
 *
 * THE SINGLE GET IS ADDRESSED BY ID AND TAKES NO DOMAIN, which is
 * the addressing rule the whole surface keeps: a domain is met by
 * slug and everything else is written by its id. A null
 * `RunRecord.domainId` on the answer is how a caller learns the pass
 * belonged to nobody, and is an ordinary reading rather than a row
 * that failed to resolve.
 *
 * THE LEDGER IS EMBEDDED, CUT AT ONE CONSTANT, AND THE CUT IS
 * REPORTED. {@link RUN_LEDGER_CAP} is passed to the store rather
 * than chosen inside it, `RunStore.countRunLedger` answers the full
 * count beside the capped list, and
 * {@link RunDetail.ledgerTruncated} is read off the rows that CAME
 * BACK rather than off a comparison against the cap — so a reader
 * shown a short ledger is told that it is short and how much of the
 * pass it is looking at. The failures queue and the corpus page make
 * the same promise about a stored body two collections over.
 *
 * NEITHER REFUSAL QUOTES ANYTHING. The two sentences below are
 * constants of this module's own, neither function builds any
 * `details` at all, and no value a caller submitted is composed into
 * either. `./service.test.ts` counts occurrences of a planted
 * sentinel in each CHANNEL of each refusal rather than asserting
 * absence, with the same count taken over a planted refusal that
 * leaks through all three, so a search that would find nothing
 * anywhere cannot report a clean refusal.
 *
 * NOTHING HERE MASKS, CUTS OR RE-ORDERS A ROW. No column on either
 * table holds a credential or a payload somebody else sent —
 * `docs/architecture/08-http-api.md` names the two surfaces that
 * answer stored untrusted text, and neither of them is this one —
 * and both orders are the store's, so a service sorting a page it
 * was handed would be answering a different order from the one the
 * window was taken under, which is how two pages come to disagree
 * about which row they hold.
 *
 * THE STORE IS A PARAMETER, so every rule here is exercisable with
 * no database: `tests/helpers/memory-research-store.ts` plants the
 * `runs` and `llm_calls` rows behind all five reads, no port writing
 * one.
 */
import type {
  LlmCallRecord,
  RunFilter,
  RunRecord,
  RunStore,
} from './store.js';
import type { DomainStore } from '../domains/store.js';
import type { StoreWindow } from '../http/schemas.js';

import { z } from 'zod';

import { NotFoundError } from '../../lib/errors/index.js';
import {
  paginationQuerySchema,
  slugParamSchema,
} from '../http/schemas.js';

/**
 * Exactly the port methods {@link listRuns} and {@link getRun}
 * reach, across both ports they reach them on.
 *
 * A `Pick` OF TWO PORTS RATHER THAN EITHER ONE WHOLE, for the reason
 * `SourceServiceStore` in `src/sources/service.ts` gives. Resolving
 * a slug is one method of `DomainStore`, and asking for that port
 * whole would have this module claim to need the domain writes it
 * never issues.
 *
 * `summariseSpend` IS THE ONE `RunStore` METHOD ABSENT, and the
 * absence is a separation rather than a saving. That method belongs
 * to `./spend-service.ts`, which windows and buckets the ledger
 * instead of paging it, so the two files cannot reach each other's
 * half by accident. There is nothing else on that port to leave out:
 * the other five are the whole of what the runs surface reads.
 *
 * Built with `Pick` rather than by listing signatures, so a method
 * here cannot drift from the thing it names: a hand-copied signature
 * would go on type-checking against a port that had moved under it.
 */
export type RunsServiceStore =
  Pick<DomainStore, 'findDomainBySlug'>
  & Pick<
    RunStore,
    | 'countRunLedger'
    | 'countRuns'
    | 'findRunById'
    | 'listRunLedger'
    | 'listRuns'
  >;

/**
 * The whole query `GET /runs` reads: a page over every pass the
 * service has made, and one optional narrowing.
 *
 * EXTENDED FROM THE SHARED DECLARATION RATHER THAN RESPELT, so the
 * default page, the 200 cap and the coercion a query string needs
 * are inherited and none of them is stated twice. Neither side
 * declares an object-level refinement, so unlike the window chain in
 * `src/findings/service.ts` there is no check a composition built
 * the other way round could silently drop — but the direction is
 * kept the same anyway, because a member added to either side later
 * would make it matter and nothing would report the day it did.
 *
 * STRICT, which it inherits rather than re-declares.
 * `paginationQuerySchema` is `.strict()` and `.extend()` keeps the
 * catchall, so `?domian=radar` is a `422` naming `query` rather than
 * a narrowing quietly dropped — which is the difference between a
 * caller being told its filter was ignored and a caller reading
 * every domain's passes as the answer to it.
 *
 * `domain` IS HELD TO {@link slugParamSchema}, THE SAME SHAPE A PATH
 * SEGMENT IS. A slug is a slug wherever it is met, and one
 * declaration serving the segment and this parameter is what stops
 * `/domains/:slug` and `?domain=` from coming to disagree about what
 * can be one. So a value that could not be a slug is a `422` naming
 * the parameter, raised before any store call, rather than a `404`
 * raised after one: a request that never named a domain has not
 * established that no domain carries it.
 *
 * NO LENGTH RULE AND NO EXISTENCE RULE BEYOND THAT. Whether a
 * well-shaped slug names a row is a question only a store can
 * answer, and {@link listRuns} is where it is asked — a schema
 * cannot know, and a second guess here would be a rule nobody would
 * notice drifting from the one that decides.
 *
 * AN ABSENT `domain` IS EVERY RUN, per this module's header, and
 * there is no third state: the parameter is present and narrows, or
 * it is absent and widens.
 */
export const runListQuerySchema = paginationQuerySchema.extend({
  domain: slugParamSchema.optional(),
});

/**
 * A parsed runs query: the page always present because both its
 * members carry a default, the narrowing present only when it was
 * sent.
 */
export type RunListQuery = z.infer<typeof runListQuerySchema>;

/**
 * How many ledger rows `GET /runs/:id` embeds in one pass's answer.
 *
 * A CAP ON A ROUTE FROM ITS FIRST COMMIT rather than one added the
 * day somebody meets a pass that needs it. Every model call the
 * service makes lands in `llm_calls` and nothing prunes it, so a run
 * that looped, retried or ran for a day is exactly the row whose
 * embedded ledger would otherwise be fetched whole — and the rows
 * are embedded rather than paged, so there is no `?perPage` bounding
 * them the way the shared window bounds a collection.
 *
 * IT IS A MODULE CONSTANT AND NOT A QUERY PARAMETER, so no caller
 * can ask for the whole of a long pass's ledger and no route can be
 * talked into serving one. What travels beside the cut is the FULL
 * count and a flag, per {@link RunDetail}, so a reader can tell a
 * cut ledger from a short one and see how much was withheld.
 *
 * DECLARED HERE RATHER THAN SHARED, which is the opposite of what
 * `BODY_CODE_POINT_CAP` in `src/http/control-bytes.ts` does one
 * concern over, and deliberately. That cap is shared because TWO
 * surfaces answer stored untrusted text and two literals agreeing on
 * the day they were written would be two caps; this one has exactly
 * one reader, and promoting it would be inventing a second surface
 * to justify the move.
 *
 * EQUAL IN MAGNITUDE TO THE SHARED `perPage` CEILING AND NOT DERIVED
 * FROM IT. Both are 200 because both bound one response body, and
 * neither is expressed in terms of the other: a page carries at most
 * `MAX_PER_PAGE` runs and a run carries at most this many calls, so
 * an implementation that read one from the other would tie the size
 * of an embedded list to a window a caller chose.
 *
 * EXPORTED SO ITS OWN CASES CAN DERIVE FROM IT. A test transcribing
 * the number would stay green against a cap that had moved, which is
 * the one change to this constant worth reporting.
 */
export const RUN_LEDGER_CAP = 200;

/**
 * What a caller is told when no domain carries the slug it named in
 * `?domain`.
 *
 * The slug is not in it, per this module's header, and it is the
 * same sentence the wave-1 and wave-2 services answer for their own
 * `:slug` — spelled again rather than imported, because the several
 * are equal by intent rather than by derivation and any of them is
 * free to change without dragging the others with it.
 */
const NO_SUCH_DOMAIN = 'No domain carries that slug';

/**
 * What a caller is told when no run carries the id it named.
 *
 * Equal by intent to the sentences the sibling groups answer for
 * their own `:id`, and spelled again on the same terms.
 */
const NO_SUCH_RUN = 'No run carries that id';

/**
 * One page of the passes the service has made, beside the size of
 * the collection it was read from.
 *
 * Two members rather than a rendered envelope, for the reason every
 * page on this surface gives: building `meta` is the router's half,
 * and this module was never told what the window was in
 * `page`/`perPage` terms.
 */
export interface RunPage {
  /**
   * The rows the window selected, `startedAt` descending with `id`
   * descending breaking a tie.
   *
   * The order is the store's, per `RunStore.listRuns`, and nothing
   * here re-sorts: a service sorting a page it was handed would be
   * answering a different order from the one the window was taken
   * under, which is how two pages come to disagree about which row
   * they hold.
   *
   * `RunRecord` passed through rather than projected. Nothing on
   * this row is a secret, nothing is cut and nothing is masked — the
   * module header says why — so a shape of this module's own would
   * be a second authority for the table's own columns.
   */
  readonly rows: readonly RunRecord[];

  /**
   * How many runs the same FILTER selects, ignoring the window.
   *
   * The same filter the page was read through, which is what keeps
   * `meta.total` describing the page's own collection: a total
   * counted without the domain narrowing would tell a caller reading
   * one domain's passes how many the deployment has made altogether.
   */
  readonly total: number;
}

/**
 * One pass and the head of what it spent, as `GET /runs/:id` answers
 * it.
 *
 * FOUR MEMBERS RATHER THAN A ROW WITH A LIST ON IT, because the list
 * is CUT and two of the four are what say so. A ledger of
 * {@link RUN_LEDGER_CAP} rows and a ledger of exactly that many
 * calls are indistinguishable without them, and a reader shown the
 * first would have no way to know it was looking at the head of
 * something longer.
 */
export interface RunDetail {
  /** The row itself, as `RunStore.findRunById` read it. */
  readonly run: RunRecord;

  /**
   * Its model calls, NEWEST FIRST, at most {@link RUN_LEDGER_CAP} of
   * them.
   *
   * Empty for a pass that called nothing, which is an ordinary state
   * rather than a failure to read: a tick that found no work to do
   * ledgers nothing at all.
   *
   * NEWEST FIRST IS WHY THE CUT IS THE USEFUL ONE. What a long
   * pass's ledger loses here is its OLDEST end, and a reader opening
   * a run is asking what it has been doing lately. The order is the
   * store's, per `RunStore.listRunLedger`.
   */
  readonly ledger: readonly LlmCallRecord[];

  /**
   * How many calls the pass ledgered ALTOGETHER, whatever was
   * answered above.
   *
   * The full count rather than the answered one, and the two differ
   * by exactly what the cap withheld — which is the number worth
   * having when deciding whether to go to the database for the rest.
   */
  readonly llmCallCount: number;

  /**
   * Whether the cap took anything.
   *
   * Beside {@link RunDetail.llmCallCount} rather than derived from
   * it by a reader, on the terms `CorpusDocument.bodyTruncated`
   * states one collection over: a client cannot compare a count
   * against a cap it was never told, and the cap is a module
   * constant rather than anything on the wire.
   */
  readonly ledgerTruncated: boolean;
}

/**
 * Turns an optional `?domain` into what `RunStore` narrows on.
 *
 * @param store - Where the domain is read.
 * @param domain - The slug the caller sent, already narrowed by
 *   {@link slugParamSchema} at whichever boundary the request
 *   entered, or `undefined` when it sent none.
 * @returns The empty filter for every run the service has made, or
 *   one naming the domain's id.
 * @throws NotFoundError - When a slug was sent and no domain carries
 *   it.
 *
 * @remarks
 * AN ABSENT SLUG COSTS NO READ AT ALL, which is what makes widening
 * the cheap answer as well as the default one: `undefined` returns
 * before any store call, so the collection that names no domain
 * asks `domains` nothing.
 *
 * Private, and its message is this module's own. Every service on
 * this surface keeps the identical helper unexported for exactly
 * this reason: a shared one would put one route group's wording on
 * another's refusals, and each is free to diverge the moment it has
 * something of its own to say. What is different here is only the
 * shape — this one answers a filter rather than a row, the id being
 * the whole of what the caller wanted the domain for.
 */
async function runFilterFor(
  store: RunsServiceStore,
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
 * Reads one window of the passes the service has made, narrowed as
 * the caller asked.
 *
 * @param store - Where the domain and its runs are read.
 * @param domain - The `?domain` slug, or `undefined` for every run
 *   including the domain-less ticks.
 * @param window - The `limit`/`offset` window, as `toStoreWindow`
 *   derived it from `?page` and `?perPage`. Already validated, so
 *   nothing here re-checks its bounds.
 * @returns The rows and the size of the whole narrowed collection.
 * @throws NotFoundError - When a slug was sent and no domain carries
 *   it. The only refusal this function has: a deployment that has
 *   run nothing, a domain that has run nothing and a window past the
 *   end are each an empty page.
 *
 * @remarks
 * THE LOOKUP IS AWAITED BEFORE THE TWO READS ARE ISSUED, which is
 * the ordering the module header argues and the one thing a reader
 * might otherwise fold into the `Promise.all` below. A 404 must cost
 * `runs` no read at all.
 *
 * The two reads that DO run are issued together, for the reason
 * every list on this surface gives: a page's rows and its
 * collection's size are independent questions, and awaiting them in
 * sequence would make every request pay two round trips to answer
 * one body. Both are handed the SAME filter, which is what keeps a
 * page's `meta.total` from describing a different collection than
 * the page.
 *
 * A WINDOW PAST THE END IS AN EMPTY PAGE RATHER THAN A 404. The
 * collection exists and only the window over it is empty, which a
 * caller can see from `meta` once the router has built one.
 */
export async function listRuns(
  store: RunsServiceStore,
  domain: string | undefined,
  window: StoreWindow,
): Promise<RunPage> {
  const filter = await runFilterFor(store, domain);
  const [rows, total] = await Promise.all([
    store.listRuns(filter, window),
    store.countRuns(filter),
  ]);

  return { rows, total };
}

/**
 * Reads one pass and the head of its ledger.
 *
 * @param store - Where the run and its calls are read.
 * @param id - The id as `resourceIdParamSchema` in
 *   `src/http/schemas.ts` parsed it.
 * @returns The row, its newest {@link RUN_LEDGER_CAP} calls, the
 *   full count of them and whether the cap took anything.
 * @throws NotFoundError - When no run carries the id. The only
 *   refusal this function has: a pass that called nothing answers an
 *   empty ledger beside a `200`.
 *
 * @remarks
 * THE LOOKUP IS AWAITED BEFORE THE TWO LEDGER READS ARE ISSUED, on
 * the reasoning {@link listRuns} gives for its own pair. Both ledger
 * reads answer emptily for an id no run carries — correctly, and
 * `RunStore.countRunLedger` says the two states are one fact from
 * its side — so a function issuing them first would answer a
 * mistyped id with two scans and then a 404.
 *
 * THE TWO THAT DO RUN ARE ISSUED TOGETHER, so one body costs one
 * round trip rather than two. They are independent: the count is not
 * read to bound the list, the cap being a constant of this module.
 *
 * THE TRUNCATION FLAG IS READ OFF WHAT CAME BACK rather than off the
 * cap. `llmCallCount > ledger.length` is true exactly when something
 * was withheld, whatever the cap is and whatever the store did with
 * it, where a comparison against {@link RUN_LEDGER_CAP} would have
 * to agree separately with how the store applied the limit — and
 * would answer `false` for a store that had quietly cut lower.
 *
 * THE ROW IS ANSWERED AS THE LOOKUP READ IT and is not read twice.
 * `findRunById` is what turns a missing id into the null this
 * refusal is decided from, and the same row is what travels — a
 * second read to answer with would be a second chance for the row to
 * move between them.
 */
export async function getRun(
  store: RunsServiceStore,
  id: number,
): Promise<RunDetail> {
  const run = await store.findRunById(id);

  if (run === null) {
    throw new NotFoundError(NO_SUCH_RUN);
  }

  const [ledger, llmCallCount] = await Promise.all([
    store.listRunLedger(id, RUN_LEDGER_CAP),
    store.countRunLedger(id),
  ]);

  return {
    run,
    ledger,
    llmCallCount,
    ledgerTruncated: llmCallCount > ledger.length,
  };
}
